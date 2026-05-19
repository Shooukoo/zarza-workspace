#!/usr/bin/env node
'use strict';

const path = require('path');

try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (_) {}

const { PrismaClient } = require('../../packages/database/generated/client');
const bcrypt = require('bcrypt');

const ADMIN_EMAIL = process.argv[2] || process.env.ADMIN_EMAIL || 'admin@rubus.com';
const ADMIN_PASS  = process.argv[3] || process.env.ADMIN_PASSWORD;

if (!ADMIN_PASS) {
  console.error('❌  ADMIN_PASSWORD env var or CLI arg is required. Aborting to prevent insecure defaults.');
  process.exit(1);
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const passwordHash = await bcrypt.hash(ADMIN_PASS, 10);

    const user = await prisma.user.upsert({
      where:  { email: ADMIN_EMAIL.toLowerCase() },
      update: { passwordHash, role: 'ADMIN' },
      create: { email: ADMIN_EMAIL.toLowerCase(), passwordHash, role: 'ADMIN' },
    });

    console.log(`\n✅  Admin listo:`);
    console.log(`    ID    : ${user.id}`);
    console.log(`    Email : ${user.email}`);
    console.log(`    Rol   : ${user.role}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('❌  Error:', err.message);
  process.exit(1);
});
