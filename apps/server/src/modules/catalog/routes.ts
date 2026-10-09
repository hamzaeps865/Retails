import { db } from '../../db/client';
import {
  categories,
  brands,
  products,
  productVariants,
} from '../../db/schema/catalog';
import { stockLevels } from '../../db/schema/inventory';
import { toMinor } from '@retail-shop-manager/shared';
import { eq, and, like, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import {
  CreateCategoryBodySchema,
  CreateBrandBodySchema,
  CreateProductBodySchema,
  CreateVariantBodySchema,
  UpdateVariantPriceBodySchema,
  PaginationQuerySchema,
} from '@retail-shop-manager/shared';

// ─── Auth hook reused across all catalog routes ────────────
async function requireAuth(request: any, reply: any) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
}

// ═══════════════════════════════════════════════════════════
// CATEGORY ROUTES
// ═══════════════════════════════════════════════════════════
export async function categoryRoutes(app: FastifyInstance) {
  app.addHook('onRequest', requireAuth);

  /** GET /api/categories — list all active categories */
  app.get('/', async (_req, reply) => {
    const rows = await db
      .select()
      .from(categories)
      .where(eq(categories.isDeleted, false));
    return reply.send({ categories: rows });
  });

  /** POST /api/categories — create a category */
  app.post('/', async (request, reply) => {
    const body = CreateCategoryBodySchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: 'Invalid input', details: body.error.flatten() });

    const [created] = await db.insert(categories).values(body.data).returning();
    return reply.status(201).send({ category: created });
  });

  /** DELETE /api/categories/:id — soft delete */
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await db.update(categories).set({ isDeleted: true }).where(eq(categories.id, Number(id)));
    return reply.send({ success: true });
  });
}

// ═══════════════════════════════════════════════════════════
// BRAND ROUTES
// ═══════════════════════════════════════════════════════════
export async function brandRoutes(app: FastifyInstance) {
  app.addHook('onRequest', requireAuth);

  /** GET /api/brands */
  app.get('/', async (_req, reply) => {
    const rows = await db.select().from(brands).where(eq(brands.isDeleted, false));
    return reply.send({ brands: rows });
  });

  /** POST /api/brands */
  app.post('/', async (request, reply) => {
    const body = CreateBrandBodySchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: 'Invalid input', details: body.error.flatten() });

    // Check duplicate
    const existing = await db.select().from(brands).where(eq(brands.name, body.data.name)).get();
    if (existing) return reply.status(409).send({ error: 'Brand already exists' });

    const [created] = await db.insert(brands).values(body.data).returning();
    return reply.status(201).send({ brand: created });
  });
}

// ═══════════════════════════════════════════════════════════
// PRODUCT ROUTES
// ═══════════════════════════════════════════════════════════
export async function productRoutes(app: FastifyInstance) {
  app.addHook('onRequest', requireAuth);

  /** GET /api/products?page=1&limit=20&search=... */
  app.get('/', async (request, reply) => {
    const query = PaginationQuerySchema.merge(
      z.object({ search: z.string().optional() })
    ).safeParse(request.query);

    if (!query.success) return reply.status(400).send({ error: 'Invalid query', details: query.error.flatten() });

    const { page, limit, search } = query.data;
    const offset = (page - 1) * limit;

    const baseWhere = and(eq(products.isDeleted, false));

    const rows = await db
      .select({
        id: products.id,
        name: products.name,
        categoryId: products.categoryId,
        brandId: products.brandId,
        gender: products.gender,
        hasExpiry: products.hasExpiry,
        returnRule: products.returnRule,
        createdAt: products.createdAt,
      })
      .from(products)
      .where(
        search
          ? and(eq(products.isDeleted, false), like(products.name, `%${search}%`))
          : eq(products.isDeleted, false)
      )
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(eq(products.isDeleted, false));

    return reply.send({ products: rows, total: count, page, limit });
  });

  /** GET /api/products/:id — product detail with variants */
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const product = await db
      .select()
      .from(products)
      .where(and(eq(products.id, Number(id)), eq(products.isDeleted, false)))
      .get();

    if (!product) return reply.status(404).send({ error: 'Product not found' });

    const variants = await db
      .select()
      .from(productVariants)
      .where(and(eq(productVariants.productId, Number(id)), eq(productVariants.isDeleted, false)));

    return reply.send({ product, variants });
  });

  /** POST /api/products — create product */
  app.post('/', async (request, reply) => {
    const body = CreateProductBodySchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: 'Invalid input', details: body.error.flatten() });

    const [created] = await db.insert(products).values(body.data).returning();
    return reply.status(201).send({ product: created });
  });

  /** PATCH /api/products/:id — update product fields */
  app.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = CreateProductBodySchema.partial().safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: 'Invalid input', details: body.error.flatten() });

    const [updated] = await db
      .update(products)
      .set(body.data)
      .where(eq(products.id, Number(id)))
      .returning();

    return reply.send({ product: updated });
  });

  /** DELETE /api/products/:id — soft delete */
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await db.update(products).set({ isDeleted: true }).where(eq(products.id, Number(id)));
    return reply.send({ success: true });
  });
}

// ═══════════════════════════════════════════════════════════
// VARIANT ROUTES
// ═══════════════════════════════════════════════════════════
export async function variantRoutes(app: FastifyInstance) {
  app.addHook('onRequest', requireAuth);

  /** POST /api/variants — create variant (prices in rupees → stored in paisa) */
  app.post('/', async (request, reply) => {
    const body = CreateVariantBodySchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: 'Invalid input', details: body.error.flatten() });

    // Check SKU uniqueness
    const existing = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.sku, body.data.sku))
      .get();
    if (existing) return reply.status(409).send({ error: 'SKU already exists' });

    // Convert major units → minor units before saving to DB
    const variantData = {
      ...body.data,
      costPrice: toMinor(body.data.costPrice),
      salePrice: toMinor(body.data.salePrice),
    };

    const [created] = await db.insert(productVariants).values(variantData).returning();

    // Initialize stock level record at 0 for this new variant
    await db.insert(stockLevels).values({ variantId: created.id, quantity: 0 });

    return reply.status(201).send({ variant: created });
  });

  /** PATCH /api/variants/:id/price — update prices */
  app.patch('/:id/price', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = UpdateVariantPriceBodySchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: 'Invalid input', details: body.error.flatten() });

    const updateData: Record<string, number> = {};
    if (body.data.costPrice !== undefined) updateData.costPrice = toMinor(body.data.costPrice);
    if (body.data.salePrice !== undefined) updateData.salePrice = toMinor(body.data.salePrice);
    if (body.data.reorderLevel !== undefined) updateData.reorderLevel = body.data.reorderLevel;

    const [updated] = await db
      .update(productVariants)
      .set(updateData)
      .where(eq(productVariants.id, Number(id)))
      .returning();

    return reply.send({ variant: updated });
  });

  /** GET /api/variants/:id/stock — get current stock level */
  app.get('/:id/stock', async (request, reply) => {
    const { id } = request.params as { id: string };
    const level = await db
      .select()
      .from(stockLevels)
      .where(eq(stockLevels.variantId, Number(id)))
      .get();

    return reply.send({ variantId: Number(id), quantity: level?.quantity ?? 0 });
  });
}
