-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'PRODUCTOR', 'AGRONOMO', 'MONITOR');

-- CreateEnum
CREATE TYPE "EstadoSolicitud" AS ENUM ('PENDIENTE', 'EN_PROGRESO', 'COMPLETADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "EstadoValidacion" AS ENUM ('pendiente', 'validado', 'rechazado');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "fcm_token" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "codigo_campo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "productor_id" UUID NOT NULL,
    "poligono_gps" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_campos" (
    "user_id" UUID NOT NULL,
    "campo_id" UUID NOT NULL,

    CONSTRAINT "user_campos_pkey" PRIMARY KEY ("user_id","campo_id")
);

-- CreateTable
CREATE TABLE "solicitudes_muestreo" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "creado_por_id" UUID NOT NULL,
    "asignado_a_id" UUID NOT NULL,
    "campo_id" UUID NOT NULL,
    "mensaje" TEXT NOT NULL,
    "estado" "EstadoSolicitud" NOT NULL DEFAULT 'PENDIENTE',
    "fecha_limite" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solicitudes_muestreo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analyses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "image_id" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "requester_user_id" UUID NOT NULL,
    "requester_email" TEXT NOT NULL,
    "variedad" TEXT,
    "fecha_analisis" TIMESTAMP(3) NOT NULL,
    "total_elementos_detectados" INTEGER NOT NULL,
    "elementos_sanos" INTEGER NOT NULL,
    "elementos_enfermos" INTEGER NOT NULL,
    "porcentaje_merma_general" DOUBLE PRECISION NOT NULL,
    "peso_sano_gramos" DOUBLE PRECISION NOT NULL,
    "ubicacion_lat" DOUBLE PRECISION,
    "ubicacion_lng" DOUBLE PRECISION,
    "campo_id" UUID NOT NULL,
    "productor_id" UUID NOT NULL,
    "offline_sync_id" TEXT,
    "validacion_estado" "EstadoValidacion" NOT NULL DEFAULT 'pendiente',
    "validacion_fue_corregido" BOOLEAN NOT NULL DEFAULT false,
    "validacion_corregido_por_id" UUID,
    "validacion_diagnostico_original" TEXT,
    "validacion_cronograma_corregido" JSONB,
    "validacion_observaciones" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fenologia_etapas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "analysis_id" UUID NOT NULL,
    "etapa" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "cambia_a" TEXT NOT NULL,
    "en_dias" INTEGER NOT NULL,
    "dias_para_cosecha" INTEGER NOT NULL,

    CONSTRAINT "fenologia_etapas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "analyses_image_id_key" ON "analyses"("image_id");

-- CreateIndex
CREATE UNIQUE INDEX "analyses_offline_sync_id_key" ON "analyses"("offline_sync_id");

-- AddForeignKey
ALTER TABLE "campos" ADD CONSTRAINT "campos_productor_id_fkey" FOREIGN KEY ("productor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_campos" ADD CONSTRAINT "user_campos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_campos" ADD CONSTRAINT "user_campos_campo_id_fkey" FOREIGN KEY ("campo_id") REFERENCES "campos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_muestreo" ADD CONSTRAINT "solicitudes_muestreo_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_muestreo" ADD CONSTRAINT "solicitudes_muestreo_asignado_a_id_fkey" FOREIGN KEY ("asignado_a_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_muestreo" ADD CONSTRAINT "solicitudes_muestreo_campo_id_fkey" FOREIGN KEY ("campo_id") REFERENCES "campos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_requester_user_id_fkey" FOREIGN KEY ("requester_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_productor_id_fkey" FOREIGN KEY ("productor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_campo_id_fkey" FOREIGN KEY ("campo_id") REFERENCES "campos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_validacion_corregido_por_id_fkey" FOREIGN KEY ("validacion_corregido_por_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fenologia_etapas" ADD CONSTRAINT "fenologia_etapas_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
