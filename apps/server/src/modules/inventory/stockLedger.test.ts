import { describe, it, expect, beforeAll } from 'vitest';
import { db, runMigrations } from '../../db/client';
import { addStockMovement } from './service';
import { stockLevels, stockMovements } from '../../db/schema/inventory';
import { products, productVariants, categories } from '../../db/schema/catalog';
import { eq } from 'drizzle-orm';

describe('Stock Ledger Service', () => {
  let testVariantId: number;

  beforeAll(async () => {
    // 1. Run migrations on the in-memory database
    runMigrations();

    // 2. Setup dummy catalog data to satisfy foreign keys
    const [cat] = await db.insert(categories).values({ name: 'Test Category' }).returning();
    const [prod] = await db.insert(products).values({ name: 'Test Product', categoryId: cat.id }).returning();
    const [variant] = await db.insert(productVariants).values({
      productId: prod.id,
      sku: 'TEST-SKU',
      costPrice: 5000,
      salePrice: 10000,
    }).returning();

    testVariantId = variant.id;
  });

  it('should initialize stock to 10 when opening movement is added', async () => {
    await addStockMovement(testVariantId, 10, 'opening', 5000, undefined, undefined, undefined, 'Initial stock');

    const cache = await db.select().from(stockLevels).where(eq(stockLevels.variantId, testVariantId)).get();
    expect(cache?.quantity).toBe(10);
  });

  it('should reduce stock by 2 when a sale movement is added', async () => {
    await addStockMovement(testVariantId, -2, 'sale', 0, undefined, 'sale', 1, 'Sold 2 items');

    const cache = await db.select().from(stockLevels).where(eq(stockLevels.variantId, testVariantId)).get();
    expect(cache?.quantity).toBe(8);
  });

  it('cached stock level must equal the sum of all stock movements', async () => {
    // Add one more movement
    await addStockMovement(testVariantId, 5, 'purchase');

    const cache = await db.select().from(stockLevels).where(eq(stockLevels.variantId, testVariantId)).get();
    
    // Sum movements
    const movements = await db.select().from(stockMovements).where(eq(stockMovements.variantId, testVariantId));
    const totalMovements = movements.reduce((acc, mov) => acc + mov.quantity, 0);

    expect(cache?.quantity).toBe(totalMovements);
    expect(cache?.quantity).toBe(13); // 10 - 2 + 5
  });
});
