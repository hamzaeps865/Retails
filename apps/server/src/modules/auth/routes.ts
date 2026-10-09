import { db } from '../../db/client';
import { roles } from '../../db/schema/core';
import { users } from '../../db/schema/core';
import { hashPassword, verifyPassword } from '../../lib/password';
import { eq, and } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import {
  LoginBodySchema,
  CreateUserBodySchema,
  CreateRoleBodySchema,
} from '@retail-shop-manager/shared';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export async function authRoutes(app: FastifyInstance) {
  /**
   * POST /api/auth/login
   * Accepts username + password, returns JWT token.
   */
  app.post('/login', async (request, reply) => {
    const body = LoginBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid input', details: body.error.flatten() });
    }

    const { username, password } = body.data;

    // Find user
    const user = await db.select().from(users).where(eq(users.username, username)).get();
    if (!user || !user.isActive) {
      return reply.status(401).send({ error: 'Invalid username or password' });
    }

    // Check lockout
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      return reply.status(423).send({ error: 'Account is temporarily locked. Try again later.' });
    }

    // Verify password
    const valid = await verifyPassword(user.passwordHash, password);

    if (!valid) {
      const newAttempts = user.failedAttempts + 1;
      const lockedUntil =
        newAttempts >= MAX_FAILED_ATTEMPTS
          ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000).toISOString()
          : null;

      await db
        .update(users)
        .set({ failedAttempts: newAttempts, lockedUntil })
        .where(eq(users.id, user.id));

      return reply.status(401).send({ error: 'Invalid username or password' });
    }

    // Reset failed attempts on success
    await db
      .update(users)
      .set({ failedAttempts: 0, lockedUntil: null })
      .where(eq(users.id, user.id));

    // Sign JWT token
    const token = await reply.jwtSign(
      { sub: user.id, username: user.username, roleId: user.roleId },
      { expiresIn: '8h' }
    );

    return reply.send({ token, user: { id: user.id, username: user.username, fullName: user.fullName } });
  });
}

export async function userRoutes(app: FastifyInstance) {
  // All routes below require authentication
  app.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  /**
   * GET /api/users
   * List all users (requires users:read permission).
   */
  app.get('/', async (request, reply) => {
    const allUsers = await db
      .select({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        roleId: users.roleId,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.isDeleted, false));

    return reply.send({ users: allUsers });
  });

  /**
   * POST /api/users
   * Create a new user (Admin only).
   */
  app.post('/', async (request, reply) => {
    const body = CreateUserBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid input', details: body.error.flatten() });
    }

    const { username, password, fullName, roleId } = body.data;

    // Check if username already exists
    const existing = await db.select().from(users).where(eq(users.username, username)).get();
    if (existing) {
      return reply.status(409).send({ error: 'Username already exists' });
    }

    const passwordHash = await hashPassword(password);

    const [created] = await db
      .insert(users)
      .values({ username, passwordHash, fullName, roleId })
      .returning({ id: users.id, username: users.username, fullName: users.fullName });

    return reply.status(201).send({ user: created });
  });

  /**
   * PATCH /api/users/:id/deactivate
   * Soft-deactivate a user.
   */
  app.patch('/:id/deactivate', async (request, reply) => {
    const { id } = request.params as { id: string };

    await db.update(users).set({ isActive: false }).where(eq(users.id, Number(id)));

    return reply.send({ success: true });
  });
}

export async function roleRoutes(app: FastifyInstance) {
  // All routes below require authentication
  app.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  /**
   * GET /api/roles
   * List all roles.
   */
  app.get('/', async (request, reply) => {
    const allRoles = await db.select().from(roles).where(eq(roles.isDeleted, false));
    return reply.send({ roles: allRoles });
  });

  /**
   * POST /api/roles
   * Create a new role with permissions.
   */
  app.post('/', async (request, reply) => {
    const body = CreateRoleBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid input', details: body.error.flatten() });
    }

    const { name, permissions } = body.data;

    const existing = await db.select().from(roles).where(eq(roles.name, name)).get();
    if (existing) {
      return reply.status(409).send({ error: 'Role name already exists' });
    }

    const [created] = await db
      .insert(roles)
      .values({ name, permissions })
      .returning({ id: roles.id, name: roles.name });

    return reply.status(201).send({ role: created });
  });
}
