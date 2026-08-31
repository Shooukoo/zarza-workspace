import 'dotenv/config';
import { randomBytes } from 'crypto';
import { execSync } from 'child_process';
import { copyFileSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@rubus/database';
import { AesGcmCrypto } from '../src/auth/infrastructure/adapters/aes-gcm-crypto.adapter';
import { planFcmKeyRotation } from '../src/auth/infrastructure/adapters/fcm-key-rotation';

const APPLY = process.argv.includes('--apply');
const ENV_PATH = join(__dirname, '..', '.env');
const REPO_ROOT = join(__dirname, '..', '..');
const FCM_KEY_LINE = /^FCM_TOKEN_ENCRYPTION_KEY=.*$/m;

async function main(): Promise<void> {
  const oldKey = process.env.FCM_TOKEN_ENCRYPTION_KEY;
  if (!oldKey) {
    console.error(
      '❌ FCM_TOKEN_ENCRYPTION_KEY no está seteada en fruit-backend/.env',
    );
    process.exit(1);
  }

  const envContent = readFileSync(ENV_PATH, 'utf8');
  if (!FCM_KEY_LINE.test(envContent)) {
    console.error(
      '❌ fruit-backend/.env no tiene una línea FCM_TOKEN_ENCRYPTION_KEY=. Abortando sin tocar nada.',
    );
    process.exit(1);
  }

  const oldCrypto = new AesGcmCrypto();
  const newKey = randomBytes(32).toString('base64');
  process.env.FCM_TOKEN_ENCRYPTION_KEY = newKey;
  const newCrypto = new AesGcmCrypto();
  process.env.FCM_TOKEN_ENCRYPTION_KEY = oldKey; // restaurar, por si algo más del proceso la lee

  const prisma = new PrismaClient();
  await prisma.$connect();

  const rows = (
    await prisma.user.findMany({
      where: { fcmToken: { not: null } },
      select: { id: true, fcmToken: true },
    })
  ).filter(
    (row): row is { id: string; fcmToken: string } => row.fcmToken !== null,
  );

  const plan = planFcmKeyRotation(rows, oldCrypto, newCrypto);

  console.log(`Usuarios con fcmToken: ${rows.length}`);
  console.log(`  Ya cifrados (se re-encriptan): ${plan.reencryptedCount}`);
  console.log(
    `  En texto plano legado (backfill): ${plan.legacyPlaintextCount}`,
  );

  if (!APPLY) {
    console.log('\nDry-run. Corré con --apply para ejecutar de verdad.');
    await prisma.$disconnect();
    return;
  }

  try {
    await prisma.$transaction(
      plan.updates.map((u) =>
        prisma.user.update({
          where: { id: u.id },
          data: { fcmToken: u.newValue },
        }),
      ),
    );
  } catch (err) {
    console.error('❌ La transacción falló, no se escribió ningún cambio:', err);
    await prisma.$disconnect();
    process.exit(1);
  }
  await prisma.$disconnect();

  try {
    const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
    const backupPath = `${ENV_PATH}.bak-${timestamp}`;
    copyFileSync(ENV_PATH, backupPath);
    writeFileSync(
      ENV_PATH,
      envContent.replace(FCM_KEY_LINE, `FCM_TOKEN_ENCRYPTION_KEY=${newKey}`),
    );
    console.log(
      `✓ ${plan.updates.length} tokens re-encriptados en la base de datos.`,
    );
    console.log(
      `✓ FCM_TOKEN_ENCRYPTION_KEY actualizada (backup: ${backupPath})`,
    );
  } catch (err) {
    console.error(
      '❌ La base de datos YA fue re-encriptada con la clave nueva, pero no se pudo actualizar fruit-backend/.env:',
      err,
    );
    console.error(
      '   CLAVE NUEVA (guardala ahora, no hay otra forma de recuperarla):',
    );
    console.error(`   FCM_TOKEN_ENCRYPTION_KEY=${newKey}`);
    console.error(
      '   Actualizá fruit-backend/.env manualmente con este valor y redesplegá fruit-backend.',
    );
    process.exit(1);
  }

  try {
    console.log('Redesplegando fruit-backend...');
    execSync('docker compose up -d --build fruit-backend', {
      cwd: REPO_ROOT,
      stdio: 'inherit',
      env: { ...process.env, FCM_TOKEN_ENCRYPTION_KEY: newKey },
    });
    console.log('✓ Listo.');
  } catch (err) {
    console.error(
      '❌ La base de datos y fruit-backend/.env ya están actualizados con la clave nueva, pero el redeploy falló:',
      err,
    );
    console.error(
      '   Corré manualmente: docker compose up -d --build fruit-backend',
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('❌ Error inesperado:', err);
  process.exit(1);
});
