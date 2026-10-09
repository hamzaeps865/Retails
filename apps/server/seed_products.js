const { db } = require('./src/db/client.ts');
const { products, productVariants, categories } = require('./src/db/schema/catalog.ts');
const { stockLevels } = require('./src/db/schema/inventory.ts');

async function seed() {
  await db.insert(categories).values({ id: 1, name: 'T-Shirts', profile: 'clothing' }).onConflictDoNothing();
  await db.insert(products).values({ id: 1, name: 'Cotton T-Shirt', categoryId: 1, gender: 'unisex' }).onConflictDoNothing();
  await db.insert(productVariants).values({ id: 1, productId: 1, sku: 'TS-001', salePrice: 150000, costPrice: 80000 }).onConflictDoNothing();
  await db.insert(stockLevels).values({ variantId: 1, quantity: 50 }).onConflictDoNothing();
  console.log('Seeded sample product and stock');
}
seed().catch(console.error);
