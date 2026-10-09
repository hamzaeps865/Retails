import { db } from '../../db/client';
import { stockMovements, stockLevels } from '../../db/schema/inventory';
import { eq } from 'drizzle-orm';

/**
 * Service to handle stock ledger operations.
 * Section 6.2: Stock is a ledger. `stock_movements` is the source of truth.
 * `stock_levels.quantity` must always equal the sum of movements for that variant.
 */

export async function addStockMovement(
  variantId: number,
  quantity: number,
  type: string,
  unitCost?: number,
  batchId?: number,
  refType?: string,
  refId?: number,
  note?: string
) {
  // We must run this inside a transaction to ensure ledger and cache stay perfectly in sync
  return await db.transaction(async (tx) => {
    // 1. Insert the movement record
    await tx.insert(stockMovements).values({
      variantId,
      quantity,
      type,
      unitCost,
      batchId,
      refType,
      refId,
      note,
    });

    // 2. Fetch the current cached stock level
    const currentStock = await tx
      .select({ quantity: stockLevels.quantity })
      .from(stockLevels)
      .where(eq(stockLevels.variantId, variantId))
      .limit(1)
      .get();

    if (currentStock) {
      // 3. Update the cached quantity
      await tx
        .update(stockLevels)
        .set({ quantity: currentStock.quantity + quantity })
        .where(eq(stockLevels.variantId, variantId));
    } else {
      // 4. Create the cached record if it doesn't exist
      await tx.insert(stockLevels).values({
        variantId,
        quantity,
      });
    }

    return true;
  });
}
