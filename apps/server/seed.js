const { db } = require('./src/db/client.ts');
const { users, roles } = require('./src/db/schema/core.ts');
const bcrypt = require('bcryptjs');

async function seed() {
  await db.insert(roles).values({ id: 1, name: 'Admin', permissions: ['all'] }).onConflictDoNothing();
  const hash = await bcrypt.hash('admin123', 10);
  await db.insert(users).values({
    username: 'admin',
    passwordHash: hash,
    fullName: 'Admin User',
    roleId: 1
  }).onConflictDoNothing();
  console.log('Seeded admin user (admin/admin123)');
}
seed().catch(console.error);
