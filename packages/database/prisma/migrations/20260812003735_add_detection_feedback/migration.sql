-- CreateEnum
CREATE TYPE "OrigenDeteccion" AS ENUM ('MODELO', 'HUMANO');

-- CreateEnum
CREATE TYPE "EstadoSalud" AS ENUM ('SANO', 'ENFERMO');

-- CreateEnum
CREATE TYPE "AccionFeedback" AS ENUM ('EDITAR', 'ELIMINAR');

-- AlterTable
ALTER TABLE "analyses" ADD COLUMN     "detecciones_revisadas" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "detecciones_revisadas_at" TIMESTAMP(3),
ADD COLUMN     "detecciones_revisadas_por_id" UUID;

-- CreateTable
CREATE TABLE "detections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "analysis_id" UUID NOT NULL,
    "origen" "OrigenDeteccion" NOT NULL DEFAULT 'MODELO',
    "clase_detectada" TEXT,
    "etapa_detectada" TEXT NOT NULL,
    "salud_detectada" "EstadoSalud" NOT NULL DEFAULT 'SANO',
    "confidence" DOUBLE PRECISION,
    "bbox_x1" DOUBLE PRECISION NOT NULL,
    "bbox_y1" DOUBLE PRECISION NOT NULL,
    "bbox_x2" DOUBLE PRECISION NOT NULL,
    "bbox_y2" DOUBLE PRECISION NOT NULL,
    "creado_por_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "detections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_feedback" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "analysis_id" UUID NOT NULL,
    "detection_id" UUID NOT NULL,
    "accion" "AccionFeedback" NOT NULL,
    "etapa_corregida" TEXT,
    "salud_corregida" "EstadoSalud",
    "bbox_x1" DOUBLE PRECISION,
    "bbox_y1" DOUBLE PRECISION,
    "bbox_x2" DOUBLE PRECISION,
    "bbox_y2" DOUBLE PRECISION,
    "observaciones" TEXT,
    "creado_por_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "model_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "detections_analysis_id_idx" ON "detections"("analysis_id");

-- CreateIndex
CREATE INDEX "model_feedback_analysis_id_idx" ON "model_feedback"("analysis_id");

-- CreateIndex
CREATE INDEX "model_feedback_detection_id_created_at_idx" ON "model_feedback"("detection_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_detecciones_revisadas_por_id_fkey" FOREIGN KEY ("detecciones_revisadas_por_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detections" ADD CONSTRAINT "detections_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detections" ADD CONSTRAINT "detections_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_feedback" ADD CONSTRAINT "model_feedback_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_feedback" ADD CONSTRAINT "model_feedback_detection_id_fkey" FOREIGN KEY ("detection_id") REFERENCES "detections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_feedback" ADD CONSTRAINT "model_feedback_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
