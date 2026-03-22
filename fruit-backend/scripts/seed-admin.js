#!/usr/bin/env node
/**
 * seed-admin.js
 * ─────────────────────────────────────────────────────────────────────
 * Crea (o actualiza) un usuario ADMIN en la base de datos MongoDB.
 *
 * Uso:
 *   node scripts/seed-admin.js
 *
 * Variables de entorno requeridas (puedes exportarlas o poner un
 * archivo .env en la raíz de fruit-backend):
 *   MONGO_URI   – URI de conexión a MongoDB
 *
 * Puedes sobrescribir email/password con argumentos posicionales:
 *   node scripts/seed-admin.js admin@zarza.com MiPassword123!
 * ─────────────────────────────────────────────────────────────────────
 */

'use strict';

const mongoose = require('mongoose');
const bcrypt   = require('bcrypt');
const path     = require('path');

// ── Cargar .env si existe ────────────────────────────────────────────
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (_) {
  // dotenv es opcional; si no está instalado seguimos con process.env
}

// ── Parámetros configurables ─────────────────────────────────────────
const MONGO_URI    = process.env.MONGO_URI || process.argv[4];
const ADMIN_EMAIL  = process.argv[2] || process.env.ADMIN_EMAIL    || 'admin@zarza.com';
const ADMIN_PASS   = process.argv[3] || process.env.ADMIN_PASSWORD || 'Admin1234!';
const SALT_ROUNDS  = 10;

// ── Validaciones básicas ─────────────────────────────────────────────
if (!MONGO_URI) {
  console.error('❌  Falta MONGO_URI. Defínela en el .env o en process.env.MONGO_URI');
  process.exit(1);
}

// ── Esquema Mongoose (espeja user.schema.ts) ─────────────────────────
const Role = { ADMIN: 'ADMIN', PRODUCTOR: 'PRODUCTOR', AGRONOMO: 'AGRONOMO', MONITOR: 'MONITOR' };

const UserSchema = new mongoose.Schema(
  {
    email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role:         { type: String, enum: Object.values(Role), required: true, default: Role.MONITOR },
  },
  { timestamps: true, collection: 'users' },
);

// ── Lógica principal ─────────────────────────────────────────────────
async function main() {
  console.log(`\n🔗  Conectando a MongoDB…`);
  await mongoose.connect(MONGO_URI);
  console.log('✅  Conexión establecida.');

  const UserModel = mongoose.model('User', UserSchema);

  const passwordHash = await bcrypt.hash(ADMIN_PASS, SALT_ROUNDS);

  const result = await UserModel.findOneAndUpdate(
    { email: ADMIN_EMAIL.toLowerCase() },
    { email: ADMIN_EMAIL.toLowerCase(), passwordHash, role: Role.ADMIN },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const action = result.createdAt?.getTime() === result.updatedAt?.getTime()
    ? 'creado'
    : 'actualizado';

  console.log(`\n🎉  Usuario ADMIN ${action} exitosamente:`);
  console.log(`    ID    : ${result._id}`);
  console.log(`    Email : ${result.email}`);
  console.log(`    Rol   : ${result.role}`);
  console.log(`    Fecha : ${result.updatedAt?.toISOString()}\n`);
}

main()
  .catch((err) => {
    console.error('❌  Error:', err.message);
    process.exit(1);
  })
  .finally(() => mongoose.disconnect());
