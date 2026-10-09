import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { fromMinor } from '@retail-shop-manager/shared';
import {
  getDashboardStats,
  getDailySalesReport,
  getLowStockReport,
  getProductPerformanceReport,
} from './service';

async function requireAuth(request: any, reply: any) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
}

export async function reportRoutes(app: FastifyInstance) {
  app.addHook('onRequest', requireAuth);

  /**
   * GET /api/reports/dashboard
   * Returns all key stats for the home screen dashboard.
   */
  app.get('/dashboard', async (_req, reply) => {
    const stats = await getDashboardStats();

    // Convert all money fields from paisa → rupees for the API response
    return reply.send({
      today: {
        revenue:    fromMinor(stats.today.revenue),
        profit:     fromMinor(stats.today.profit),
        salesCount: stats.today.salesCount,
        itemsSold:  stats.today.itemsSold,
      },
      thisMonth: {
        revenue:    fromMinor(stats.thisMonth.revenue),
        profit:     fromMinor(stats.thisMonth.profit),
        salesCount: stats.thisMonth.salesCount,
      },
      lowStockItems: stats.lowStockItems,
      topProducts: stats.topProducts.map((p) => ({
        ...p,
        revenue: fromMinor(p.revenue),
      })),
    });
  });

  /**
   * GET /api/reports/sales/daily?from=YYYY-MM-DD&to=YYYY-MM-DD
   * Daily breakdown of revenue, profit, and sales count.
   */
  app.get('/sales/daily', async (request, reply) => {
    const querySchema = z.object({
      from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format'),
      to:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format'),
    });

    const query = querySchema.safeParse(request.query);
    if (!query.success) return reply.status(400).send({ error: 'Invalid query', details: query.error.flatten() });

    const from = `${query.data.from}T00:00:00.000Z`;
    const to   = `${query.data.to}T23:59:59.999Z`;

    const rows = await getDailySalesReport(from, to);

    return reply.send({
      rows: rows.map((r) => ({
        date:       r.date,
        revenue:    fromMinor(r.revenue),
        profit:     fromMinor(r.profit),
        salesCount: r.salesCount,
        itemsSold:  r.itemsSold,
      })),
    });
  });

  /**
   * GET /api/reports/stock/low
   * All variants at or below their reorder level — sorted lowest stock first.
   */
  app.get('/stock/low', async (_req, reply) => {
    const items = await getLowStockReport();

    return reply.send({
      items: items.map((i) => ({
        variantId:    i.variantId,
        sku:          i.sku,
        productName:  i.productName,
        quantity:     i.quantity,
        reorderLevel: i.reorderLevel,
        salePrice:    fromMinor(i.salePrice),
        deficit:      Math.max(0, i.reorderLevel - i.quantity),
      })),
      total: items.length,
    });
  });

  /**
   * GET /api/reports/products/performance?days=30
   * Product sales performance — revenue, cost, profit, margin.
   */
  app.get('/products/performance', async (request, reply) => {
    const querySchema = z.object({
      days: z.coerce.number().int().min(1).max(365).default(30),
    });

    const query = querySchema.safeParse(request.query);
    if (!query.success) return reply.status(400).send({ error: 'Invalid query' });

    const rows = await getProductPerformanceReport(query.data.days);

    return reply.send({
      days: query.data.days,
      rows: rows.map((r) => ({
        productId:   r.productId,
        productName: r.productName,
        sku:         r.sku,
        unitsSold:   r.unitsSold,
        revenue:     fromMinor(r.revenue),
        cost:        fromMinor(r.cost),
        profit:      fromMinor(r.profit),
        margin:      r.margin,   // already a percentage number
      })),
    });
  });
}
