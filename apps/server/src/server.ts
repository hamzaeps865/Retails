import Fastify from 'fastify';
import sensible from '@fastify/sensible';
import jwt from '@fastify/jwt';
import { runMigrations } from './db/client';
import { authRoutes, userRoutes, roleRoutes } from './modules/auth/routes';
import { categoryRoutes, brandRoutes, productRoutes, variantRoutes } from './modules/catalog/routes';
import { salesRoutes, customerRoutes } from './modules/sales/routes';
import { reportRoutes } from './modules/reports/routes';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';

const server = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true },
    },
  },
});

// ── Plugins ────────────────────────────────────────────────
server.register(sensible);

server.register(jwt, {
  secret: JWT_SECRET,
  sign: { algorithm: 'HS256' },
});

// ── Health Check (public) ──────────────────────────────────
server.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

// ── API Routes ─────────────────────────────────────────────
server.register(authRoutes, { prefix: '/api/auth' });
server.register(userRoutes,  { prefix: '/api/users' });
server.register(roleRoutes,  { prefix: '/api/roles' });

// ── Catalog ────────────────────────────────────────────────
server.register(categoryRoutes, { prefix: '/api/categories' });
server.register(brandRoutes,    { prefix: '/api/brands' });
server.register(productRoutes,  { prefix: '/api/products' });
server.register(variantRoutes,  { prefix: '/api/variants' });

// ── Sales & Customers ──────────────────────────────────
server.register(salesRoutes,    { prefix: '/api/sales' });
server.register(customerRoutes, { prefix: '/api/customers' });

// ── Reports ───────────────────────────────────────
server.register(reportRoutes,   { prefix: '/api/reports' });

// ── Global Error Handler ───────────────────────────────────
server.setErrorHandler((error, request, reply) => {
  server.log.error(error);
  reply.status(error.statusCode ?? 500).send({
    error: error.message ?? 'Internal Server Error',
  });
});

// ── Start ──────────────────────────────────────────────────
const start = async () => {
  try {
    runMigrations();
    await server.listen({ port: 3000, host: '127.0.0.1' });
    server.log.info('Server running at http://127.0.0.1:3000');
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
