-- CreateEnum
CREATE TYPE "TrainingJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ModelVersionStatus" AS ENUM ('ENTRENADO', 'LISTO_PARA_PROMOVER', 'DESCARTADO', 'PROMOVIDO', 'REEMPLAZADO');

-- CreateTable
CREATE TABLE "training_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "status" "TrainingJobStatus" NOT NULL DEFAULT 'PENDING',
    "dataset_size" INTEGER,
    "error_message" TEXT,
    "iniciado_por_id" UUID NOT NULL,
    "iniciado_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizado_at" TIMESTAMP(3),

    CONSTRAINT "training_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "version" INTEGER NOT NULL,
    "r2_key" TEXT,
    "mAP" DOUBLE PRECISION,
    "map_base" DOUBLE PRECISION,
    "status" "ModelVersionStatus" NOT NULL DEFAULT 'ENTRENADO',
    "training_job_id" UUID NOT NULL,
    "promovido_por_id" UUID,
    "promovido_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "model_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "model_versions_version_key" ON "model_versions"("version");

-- CreateIndex
CREATE UNIQUE INDEX "model_versions_training_job_id_key" ON "model_versions"("training_job_id");

-- AddForeignKey
ALTER TABLE "training_jobs" ADD CONSTRAINT "training_jobs_iniciado_por_id_fkey" FOREIGN KEY ("iniciado_por_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_versions" ADD CONSTRAINT "model_versions_training_job_id_fkey" FOREIGN KEY ("training_job_id") REFERENCES "training_jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_versions" ADD CONSTRAINT "model_versions_promovido_por_id_fkey" FOREIGN KEY ("promovido_por_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
