#!/usr/bin/env node
'use strict';

const path = require('path');

try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (_) {}

const { PrismaClient } = require('../../packages/database/generated/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    // 1. fenologia_etapas cascade al borrar analyses
    const etapas = await prisma.fenologiaEtapa.deleteMany({});
    console.log(`🗑  fenologia_etapas eliminadas : ${etapas.count}`);

    // 2. analyses
    const analyses = await prisma.analysis.deleteMany({});
    console.log(`🗑  analyses eliminados         : ${analyses.count}`);

    // 3. solicitudes_muestreo
    const solicitudes = await prisma.solicitudMuestreo.deleteMany({});
    console.log(`🗑  solicitudes eliminadas       : ${solicitudes.count}`);

    // 4. user_campos
    const userCampos = await prisma.userCampo.deleteMany({});
    console.log(`🗑  user_campos eliminados       : ${userCampos.count}`);

    // 5. campos
    const campos = await prisma.campo.deleteMany({});
    console.log(`🗑  campos eliminados            : ${campos.count}`);

    // 6. usuarios no-admin
    const users = await prisma.user.deleteMany({
      where: { role: { not: 'ADMIN' } },
    });
    console.log(`🗑  usuarios no-admin eliminados : ${users.count}`);

    // Verificación
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
    console.log(`\n✅  Base de datos limpia. Admin(s) restantes:`);
    admins.forEach((u) => console.log(`    - ${u.email} (${u.id})`));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('❌  Error:', err.message);
  process.exit(1);
});
