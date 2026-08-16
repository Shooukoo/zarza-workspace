/*
  Warnings:

  - You are about to drop the column `mAP` on the `model_versions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "model_versions" DROP COLUMN "mAP",
ADD COLUMN     "map" DOUBLE PRECISION;
