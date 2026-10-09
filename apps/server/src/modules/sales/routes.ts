import type { FastifyInstance } from 'fastify';
import { db } from '../../db/client';
import { sales, saleItems, salePayments, customers } from '../../db/schema/sales';
import { eq, desc, and } from 'drizzle-orm';
import { fromMinor } from '@retail-shop-manager/shared';
import {
  CreateSaleBodySchema,
  VoidSaleBodySchema,
  CreateCustomerBodySchema,
  PaginationQuerySchema,
} from '@retail-shop-manager/shared';
import { createSale, voidSale, createCustomer } from './service';

async function requireAuth(request: any, reply: any) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
}

// ═══════════════════════════════════════════════════════════
// SALES ROUTES
// ═══════════════════════════════════════════════════════════
export async function salesRoutes(app: FastifyInstance) {
  app.addHook('onRequest', requireAuth);

  /**
   * POST /api/sales
   * The main POS checkout endpoint. Creates a complete sale atomically.
   */
  app.post('/', async (request, reply) => {
    const body = CreateSaleBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid input', details: body.error.flatten() });
    }

    const cashierId = (request.user as any).sub as number;

    try {
      const result = await createSale(body.data, cashierId);
      return reply.status(201).send({
        saleId:    result.saleId,
        invoiceNo: result.invoiceNo,
        total:     fromMinor(result.total),     // Return in Rs for display
        paid:      fromMinor(result.paid),
        change:    fromMinor(result.change),
      });
    } catch (err: any) {
      // Business-logic errors (insufficient stock, underpayment, etc.)
      return reply.status(422).send({ error: err.message });
    }
  });

  /**
   * GET /api/sales — paginated list of sales
   */
  app.get('/', async (request, reply) => {
    const query = PaginationQuerySchema.safeParse(request.query);
    if (!query.success) return reply.status(400).send({ error: 'Invalid query' });

    const { page, limit } = query.data;
    const offset = (page - 1) * limit;

    const rows = await db
      .select({
        id:        sales.id,
        invoiceNo: sales.invoiceNo,
        total:     sales.total,
        paid:      sales.paid,
        change:    sales.change,
        status:    sales.status,
        createdAt: sales.createdAt,
        cashierId: sales.cashierId,
        customerId: sales.customerId,
      })
      .from(sales)
      .orderBy(desc(sales.createdAt))
      .limit(limit)
      .offset(offset);

    // Convert amounts to rupees for the API response
    const formatted = rows.map((s) => ({
      ...s,
      total:  fromMinor(s.total),
      paid:   fromMinor(s.paid),
      change: fromMinor(s.change),
    }));

    return reply.send({ sales: formatted, page, limit });
  });

  /**
   * GET /api/sales/:id — full sale detail with items and payments
   */
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const sale = await db.select().from(sales).where(eq(sales.id, Number(id))).get();
    if (!sale) return reply.status(404).send({ error: 'Sale not found' });

    const items    = await db.select().from(saleItems).where(eq(saleItems.saleId, Number(id)));
    const payments = await db.select().from(salePayments).where(eq(salePayments.saleId, Number(id)));

    return reply.send({
      sale: {
        ...sale,
        total:    fromMinor(sale.total),
        paid:     fromMinor(sale.paid),
        change:   fromMinor(sale.change),
        subtotal: fromMinor(sale.subtotal),
        discount: fromMinor(sale.discount),
      },
      items: items.map((i) => ({
        ...i,
        unitPrice: fromMinor(i.unitPrice),
        unitCost:  fromMinor(i.unitCost),
        lineTotal: fromMinor(i.lineTotal),
      })),
      payments: payments.map((p) => ({
        ...p,
        amount: fromMinor(p.amount),
      })),
    });
  });

  /**
   * POST /api/sales/:id/void — void a completed sale and reverse stock
   */
  app.post('/:id/void', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = VoidSaleBodySchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: 'Invalid input', details: body.error.flatten() });

    const operatorId = (request.user as any).sub as number;

    try {
      await voidSale(Number(id), operatorId, body.data.reason);
      return reply.send({ success: true });
    } catch (err: any) {
      return reply.status(422).send({ error: err.message });
    }
  });
}

// ═══════════════════════════════════════════════════════════
// CUSTOMER ROUTES
// ═══════════════════════════════════════════════════════════
export async function customerRoutes(app: FastifyInstance) {
  app.addHook('onRequest', requireAuth);

  /** GET /api/customers */
  app.get('/', async (request, reply) => {
    const query = PaginationQuerySchema.safeParse(request.query);
    if (!query.success) return reply.status(400).send({ error: 'Invalid query' });

    const { page, limit } = query.data;
    const rows = await db
      .select()
      .from(customers)
      .where(eq(customers.isDeleted, false))
      .limit(limit)
      .offset((page - 1) * limit);

    return reply.send({
      customers: rows.map((c) => ({
        ...c,
        creditLimit:    fromMinor(c.creditLimit),
        openingBalance: fromMinor(c.openingBalance),
      })),
    });
  });

  /** POST /api/customers */
  app.post('/', async (request, reply) => {
    const body = CreateCustomerBodySchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: 'Invalid input', details: body.error.flatten() });

    const customer = await createCustomer(body.data);
    return reply.status(201).send({
      customer: {
        ...customer,
        creditLimit:    fromMinor(customer.creditLimit),
        openingBalance: fromMinor(customer.openingBalance),
      },
    });
  });
}
