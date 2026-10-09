/**
 * POS Sale Service — the most critical transaction logic in the entire app.
 *
 * Rules (from PROJECT_GUIDE.md Section 6):
 *  - ALL money stored in minor units (paisa). Never floats.
 *  - Stock ledger is source of truth. stock_levels.quantity is a cached sum.
 *  - EVERYTHING inside createSale runs in a SINGLE DB transaction.
 *    If anything fails, the whole sale is rolled back atomically.
 *  - Invoice numbers are sequential and never recycled.
 */

import { db } from '../../db/client';
import { sales, saleItems, salePayments, customers } from '../../db/schema/sales';
import { productVariants } from '../../db/schema/catalog';
import { stockMovements, stockLevels } from '../../db/schema/inventory';
import { settings } from '../../db/schema/core';
import { toMinor } from '@retail-shop-manager/shared';
import type { CreateSaleBody, CreateCustomerBody } from '@retail-shop-manager/shared';
import { eq } from 'drizzle-orm';

// ─── Invoice Number Generator ─────────────────────────────────
async function generateInvoiceNumber(tx: typeof db): Promise<string> {
  const row = await tx
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, 'last_invoice_no'))
    .get();

  const lastNo = row ? parseInt(row.value, 10) : 0;
  const nextNo = lastNo + 1;

  if (row) {
    await tx.update(settings).set({ value: String(nextNo) }).where(eq(settings.key, 'last_invoice_no'));
  } else {
    await tx.insert(settings).values({ key: 'last_invoice_no', value: String(nextNo) });
  }

  // Format: INV-000001
  return `INV-${String(nextNo).padStart(6, '0')}`;
}

// ─── Main Sale Creator ────────────────────────────────────────
export interface CreateSaleResult {
  saleId: number;
  invoiceNo: string;
  total: number;       // minor units
  paid: number;        // minor units
  change: number;      // minor units
}

export async function createSale(
  input: CreateSaleBody,
  cashierId: number
): Promise<CreateSaleResult> {
  return await db.transaction(async (tx) => {

    // ── STEP 1: Load & validate all variants ──────────────────
    const variantIds = input.items.map((i) => i.variantId);
    const loadedVariants = await Promise.all(
      variantIds.map((id) =>
        tx.select().from(productVariants).where(eq(productVariants.id, id)).get()
      )
    );

    for (let i = 0; i < loadedVariants.length; i++) {
      const variant = loadedVariants[i];
      const item = input.items[i];
      if (!variant) throw new Error(`Variant ${item.variantId} not found`);
    }

    // ── STEP 2: Check stock availability ─────────────────────
    for (const item of input.items) {
      const level = await tx
        .select({ quantity: stockLevels.quantity })
        .from(stockLevels)
        .where(eq(stockLevels.variantId, item.variantId))
        .get();

      const available = level?.quantity ?? 0;
      if (available < item.quantity) {
        const variant = loadedVariants.find((v) => v?.id === item.variantId);
        throw new Error(
          `Insufficient stock for SKU "${variant?.sku}": requested ${item.quantity}, available ${available}`
        );
      }
    }

    // ── STEP 3: Calculate totals in minor units ───────────────
    let subtotal = 0;
    const lineItems: Array<{
      variantId: number;
      quantity: number;
      unitPrice: number;  // minor
      unitCost: number;   // minor
      discount: number;   // minor
      lineTotal: number;  // minor
    }> = [];

    for (let i = 0; i < input.items.length; i++) {
      const item = input.items[i];
      const variant = loadedVariants[i]!;

      const unitPrice   = variant.salePrice;                    // already minor
      const unitCost    = variant.costPrice;                    // already minor
      const itemDiscount = toMinor(item.discount);              // Rs → paisa
      const lineTotal   = unitPrice * item.quantity - itemDiscount;

      subtotal += lineTotal;
      lineItems.push({ variantId: item.variantId, quantity: item.quantity, unitPrice, unitCost, discount: itemDiscount, lineTotal });
    }

    const saleDiscount = toMinor(input.discount);    // Rs → paisa
    const total        = subtotal - saleDiscount;
    const paid         = input.payments.reduce((sum, p) => sum + toMinor(p.amount), 0);
    const change       = Math.max(0, paid - total);

    if (paid < total) {
      throw new Error(`Underpayment: total is ${total} paisa, but only ${paid} paisa received`);
    }

    // ── STEP 4: Generate unique invoice number ─────────────────
    const invoiceNo = await generateInvoiceNumber(tx as unknown as typeof db);

    // ── STEP 5: Insert sale header ────────────────────────────
    const [sale] = await tx.insert(sales).values({
      invoiceNo,
      customerId:  input.customerId,
      cashierId,
      subtotal,
      discount:    saleDiscount,
      tax:         0,
      total,
      paid,
      change,
      status:      'completed',
    }).returning({ id: sales.id });

    // ── STEP 6: Insert sale line items ────────────────────────
    for (const line of lineItems) {
      await tx.insert(saleItems).values({
        saleId:    sale.id,
        variantId: line.variantId,
        quantity:  line.quantity,
        unitPrice: line.unitPrice,
        unitCost:  line.unitCost,
        discount:  line.discount,
        lineTotal: line.lineTotal,
      });
    }

    // ── STEP 7: Insert payments ───────────────────────────────
    for (const payment of input.payments) {
      await tx.insert(salePayments).values({
        saleId:    sale.id,
        method:    payment.method,
        amount:    toMinor(payment.amount),
        reference: payment.reference,
      });
    }

    // ── STEP 8: Deduct stock (ledger + cache, atomically) ─────
    for (const item of input.items) {
      // Insert stock movement (negative = stock out)
      await tx.insert(stockMovements).values({
        variantId: item.variantId,
        quantity:  -item.quantity,
        type:      'sale',
        refType:   'sale',
        refId:     sale.id,
      });

      // Update cached stock level
      const current = await tx
        .select({ quantity: stockLevels.quantity })
        .from(stockLevels)
        .where(eq(stockLevels.variantId, item.variantId))
        .get();

      await tx
        .update(stockLevels)
        .set({ quantity: (current?.quantity ?? 0) - item.quantity })
        .where(eq(stockLevels.variantId, item.variantId));
    }

    return { saleId: sale.id, invoiceNo, total, paid, change };
  });
}

// ─── Void Sale Service ────────────────────────────────────────
export async function voidSale(saleId: number, voidedById: number, reason: string): Promise<void> {
  return await db.transaction(async (tx) => {
    const sale = await tx.select().from(sales).where(eq(sales.id, saleId)).get();
    if (!sale) throw new Error('Sale not found');
    if (sale.status === 'voided') throw new Error('Sale is already voided');

    // Mark sale as voided
    await tx.update(sales)
      .set({ status: 'voided', voidedBy: voidedById, voidReason: reason })
      .where(eq(sales.id, saleId));

    // Load original items to reverse stock
    const items = await tx.select().from(saleItems).where(eq(saleItems.saleId, saleId));

    // Reverse each stock deduction
    for (const item of items) {
      await tx.insert(stockMovements).values({
        variantId: item.variantId,
        quantity:  item.quantity,  // positive = stock return
        type:      'return_in',
        refType:   'sale',
        refId:     saleId,
        note:      `Void: ${reason}`,
      });

      const current = await tx
        .select({ quantity: stockLevels.quantity })
        .from(stockLevels)
        .where(eq(stockLevels.variantId, item.variantId))
        .get();

      await tx
        .update(stockLevels)
        .set({ quantity: (current?.quantity ?? 0) + item.quantity })
        .where(eq(stockLevels.variantId, item.variantId));
    }
  });
}

// ─── Customer Service ─────────────────────────────────────────
export async function createCustomer(input: CreateCustomerBody) {
  const [customer] = await db.insert(customers).values({
    name:           input.name,
    phone:          input.phone,
    address:        input.address,
    creditLimit:    toMinor(input.creditLimit),
    openingBalance: toMinor(input.openingBalance),
  }).returning();
  return customer;
}
