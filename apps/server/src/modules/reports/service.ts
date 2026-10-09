/**
 * Reporting Service — Phase 5
 *
 * All monetary values returned from these functions are in MINOR units (paisa).
 * The route layer converts to major units (Rs) before sending to the client.
 */

import { db } from '../../db/client';
import { sales, saleItems } from '../../db/schema/sales';
import { products, productVariants } from '../../db/schema/catalog';
import { stockLevels } from '../../db/schema/inventory';
import { eq, gte, lte, and, sum, count, sql, desc, lt } from 'drizzle-orm';

// ─── Date helpers ────────────────────────────────────────────

function startOfDay(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function endOfDay(date: Date): string {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// ════════════════════════════════════════════════════════════
// DASHBOARD STATS
// ════════════════════════════════════════════════════════════

export interface DashboardStats {
  today: {
    revenue: number;       // minor units
    profit:  number;       // minor units
    salesCount: number;
    itemsSold: number;
  };
  thisMonth: {
    revenue: number;
    profit:  number;
    salesCount: number;
  };
  lowStockItems: number;   // count of variants below reorder level
  topProducts: Array<{
    productId: number;
    productName: string;
    unitsSold: number;
    revenue: number;       // minor units
  }>;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const now  = new Date();
  const todayStart = startOfDay(now);
  const todayEnd   = endOfDay(now);

  // First day of current month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // ── Today's sales ─────────────────────────────────────────
  const todaySales = await db
    .select({
      revenue:    sum(sales.total).mapWith(Number),
      salesCount: count(),
    })
    .from(sales)
    .where(
      and(
        eq(sales.status, 'completed'),
        gte(sales.createdAt, todayStart),
        lte(sales.createdAt, todayEnd)
      )
    )
    .get();

  // Today's items sold
  const todayItems = await db
    .select({ itemsSold: sum(saleItems.quantity).mapWith(Number) })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .where(
      and(
        eq(sales.status, 'completed'),
        gte(sales.createdAt, todayStart),
        lte(sales.createdAt, todayEnd)
      )
    )
    .get();

  // Today's profit = sum(lineTotal) - sum(unitCost * quantity)
  const todayProfit = await db
    .select({
      totalRevenue: sum(saleItems.lineTotal).mapWith(Number),
      totalCost:    sql<number>`SUM(${saleItems.unitCost} * ${saleItems.quantity})`.mapWith(Number),
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .where(
      and(
        eq(sales.status, 'completed'),
        gte(sales.createdAt, todayStart),
        lte(sales.createdAt, todayEnd)
      )
    )
    .get();

  // ── This month ────────────────────────────────────────────
  const monthSales = await db
    .select({
      revenue:    sum(sales.total).mapWith(Number),
      salesCount: count(),
    })
    .from(sales)
    .where(and(eq(sales.status, 'completed'), gte(sales.createdAt, monthStart)))
    .get();

  const monthProfit = await db
    .select({
      totalRevenue: sum(saleItems.lineTotal).mapWith(Number),
      totalCost:    sql<number>`SUM(${saleItems.unitCost} * ${saleItems.quantity})`.mapWith(Number),
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .where(and(eq(sales.status, 'completed'), gte(sales.createdAt, monthStart)))
    .get();

  // ── Low stock count ───────────────────────────────────────
  const lowStockRows = await db
    .select({ count: count() })
    .from(stockLevels)
    .innerJoin(productVariants, eq(stockLevels.variantId, productVariants.id))
    .where(sql`${stockLevels.quantity} <= ${productVariants.reorderLevel}`)
    .get();

  // ── Top 5 products by units sold (last 30 days) ───────────
  const thirtyDaysAgo = daysAgo(30).toISOString();

  const topProductRows = await db
    .select({
      productId:   products.id,
      productName: products.name,
      unitsSold:   sum(saleItems.quantity).mapWith(Number),
      revenue:     sum(saleItems.lineTotal).mapWith(Number),
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .innerJoin(productVariants, eq(saleItems.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(and(eq(sales.status, 'completed'), gte(sales.createdAt, thirtyDaysAgo)))
    .groupBy(products.id, products.name)
    .orderBy(desc(sum(saleItems.quantity)))
    .limit(5);

  return {
    today: {
      revenue:    todaySales?.revenue    ?? 0,
      profit:     (todayProfit?.totalRevenue ?? 0) - (todayProfit?.totalCost ?? 0),
      salesCount: todaySales?.salesCount ?? 0,
      itemsSold:  todayItems?.itemsSold  ?? 0,
    },
    thisMonth: {
      revenue:    monthSales?.revenue    ?? 0,
      profit:     (monthProfit?.totalRevenue ?? 0) - (monthProfit?.totalCost ?? 0),
      salesCount: monthSales?.salesCount ?? 0,
    },
    lowStockItems: lowStockRows?.count ?? 0,
    topProducts: topProductRows.map((r) => ({
      productId:   r.productId,
      productName: r.productName,
      unitsSold:   r.unitsSold ?? 0,
      revenue:     r.revenue   ?? 0,
    })),
  };
}

// ════════════════════════════════════════════════════════════
// DAILY SALES REPORT
// ════════════════════════════════════════════════════════════

export interface DailySalesReport {
  date:       string;
  revenue:    number;
  profit:     number;
  salesCount: number;
  itemsSold:  number;
}

export async function getDailySalesReport(fromDate: string, toDate: string): Promise<DailySalesReport[]> {
  const rows = await db
    .select({
      date:       sql<string>`DATE(${sales.createdAt})`,
      revenue:    sum(sales.total).mapWith(Number),
      salesCount: count(),
      itemsSold:  sum(saleItems.quantity).mapWith(Number),
      totalCost:  sql<number>`SUM(${saleItems.unitCost} * ${saleItems.quantity})`.mapWith(Number),
      totalLine:  sum(saleItems.lineTotal).mapWith(Number),
    })
    .from(sales)
    .innerJoin(saleItems, eq(saleItems.saleId, sales.id))
    .where(
      and(
        eq(sales.status, 'completed'),
        gte(sales.createdAt, fromDate),
        lte(sales.createdAt, toDate)
      )
    )
    .groupBy(sql`DATE(${sales.createdAt})`)
    .orderBy(sql`DATE(${sales.createdAt})`);

  return rows.map((r) => ({
    date:       r.date,
    revenue:    r.revenue    ?? 0,
    profit:     (r.totalLine ?? 0) - (r.totalCost ?? 0),
    salesCount: r.salesCount ?? 0,
    itemsSold:  r.itemsSold  ?? 0,
  }));
}

// ════════════════════════════════════════════════════════════
// LOW STOCK REPORT
// ════════════════════════════════════════════════════════════

export interface LowStockItem {
  variantId:    number;
  sku:          string;
  productName:  string;
  quantity:     number;
  reorderLevel: number;
  salePrice:    number;   // minor units
}

export async function getLowStockReport(): Promise<LowStockItem[]> {
  const rows = await db
    .select({
      variantId:    productVariants.id,
      sku:          productVariants.sku,
      productName:  products.name,
      quantity:     stockLevels.quantity,
      reorderLevel: productVariants.reorderLevel,
      salePrice:    productVariants.salePrice,
    })
    .from(stockLevels)
    .innerJoin(productVariants, eq(stockLevels.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(
      and(
        sql`${stockLevels.quantity} <= ${productVariants.reorderLevel}`,
        eq(productVariants.isDeleted, false)
      )
    )
    .orderBy(stockLevels.quantity);

  return rows;
}

// ════════════════════════════════════════════════════════════
// PRODUCT PERFORMANCE REPORT (last N days)
// ════════════════════════════════════════════════════════════

export interface ProductPerformanceRow {
  productId:   number;
  productName: string;
  sku:         string;
  unitsSold:   number;
  revenue:     number;  // minor units
  cost:        number;  // minor units
  profit:      number;  // minor units
  margin:      number;  // percentage 0-100
}

export async function getProductPerformanceReport(days: number): Promise<ProductPerformanceRow[]> {
  const since = daysAgo(days).toISOString();

  const rows = await db
    .select({
      productId:   products.id,
      productName: products.name,
      sku:         productVariants.sku,
      unitsSold:   sum(saleItems.quantity).mapWith(Number),
      revenue:     sum(saleItems.lineTotal).mapWith(Number),
      cost:        sql<number>`SUM(${saleItems.unitCost} * ${saleItems.quantity})`.mapWith(Number),
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .innerJoin(productVariants, eq(saleItems.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(and(eq(sales.status, 'completed'), gte(sales.createdAt, since)))
    .groupBy(products.id, products.name, productVariants.sku)
    .orderBy(desc(sum(saleItems.lineTotal)))
    .limit(100);

  return rows.map((r) => {
    const revenue = r.revenue ?? 0;
    const cost    = r.cost    ?? 0;
    const profit  = revenue - cost;
    const margin  = revenue > 0 ? Math.round((profit / revenue) * 100 * 100) / 100 : 0;
    return {
      productId:   r.productId,
      productName: r.productName,
      sku:         r.sku,
      unitsSold:   r.unitsSold ?? 0,
      revenue,
      cost,
      profit,
      margin,
    };
  });
}
