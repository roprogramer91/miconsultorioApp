-- CreateEnum
CREATE TYPE "TurnoStatus" AS ENUM ('PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED_BY_PATIENT', 'CANCELLED_BY_DOCTOR', 'EXPIRED', 'NO_SHOW', 'ATTENDED');

-- CreateEnum
CREATE TYPE "TurnoSource" AS ENUM ('WEB', 'APP_DOCTOR', 'MANUAL');

-- CreateEnum
CREATE TYPE "CancelledBy" AS ENUM ('PATIENT', 'DOCTOR', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ExceptionType" AS ENUM ('BLOCK', 'EXTRA');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('MERCADOPAGO');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- DropForeignKey
ALTER TABLE "pacientes" DROP CONSTRAINT "pacientes_usuario_id_fkey";

-- BACKFILL PACIENTES (Seguridad: si un usuario viejo no tenia user_id, mandarlo al 1)
UPDATE "pacientes" SET "usuario_id" = 1 WHERE "usuario_id" IS NULL;

-- AlterTable
ALTER TABLE "pacientes" ALTER COLUMN "usuario_id" SET NOT NULL;

-- AlterTable (Añadiendo columnas que no requieren NOT NULL estricto primero)
ALTER TABLE "turnos" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledBy" "CancelledBy",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "fin" TIMESTAMP(3),
ADD COLUMN     "source" "TurnoSource" NOT NULL DEFAULT 'WEB',
ADD COLUMN     "usuario_id" INTEGER;

-- BACKFILL TURNOS
-- 1. Heredar el usuario_id del paciente
UPDATE "turnos" SET "usuario_id" = p."usuario_id" 
FROM "pacientes" p WHERE "turnos"."paciente_id" = p."id";
-- 2. Fallback
UPDATE "turnos" SET "usuario_id" = 1 WHERE "usuario_id" IS NULL;
-- 3. Setear Fin aproximado
UPDATE "turnos" SET "fin" = "inicio" + interval '30 minutes';

-- AHORA setear las columnas a NOT NULL
ALTER TABLE "turnos" ALTER COLUMN "usuario_id" SET NOT NULL;
ALTER TABLE "turnos" ALTER COLUMN "fin" SET NOT NULL;

-- PRESERVAR EL ESTADO (Castear de String a Enum nuevo)
ALTER TABLE "turnos" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "turnos" ALTER COLUMN "estado" TYPE "TurnoStatus" USING (
  CASE 
    WHEN "estado" = 'programado' THEN 'CONFIRMED'::"TurnoStatus"
    ELSE 'PENDING_PAYMENT'::"TurnoStatus"
  END
);
ALTER TABLE "turnos" ALTER COLUMN "estado" SET DEFAULT 'PENDING_PAYMENT';


-- AlterTable
ALTER TABLE "push_tokens" ADD COLUMN     "paciente_id" INTEGER,
ADD COLUMN     "usuario_id" INTEGER;

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "address" TEXT,
ADD COLUMN     "appointmentDurationMinutes" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "depositPercent" DECIMAL(5,2) DEFAULT 50,
ADD COLUMN     "price" DECIMAL(10,2) DEFAULT 0,
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "specialty" TEXT,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'America/Argentina/Buenos_Aires';

-- CreateTable
CREATE TABLE "availability_rules" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,

    CONSTRAINT "availability_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availability_exceptions" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "type" "ExceptionType" NOT NULL DEFAULT 'BLOCK',

    CONSTRAINT "availability_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" SERIAL NOT NULL,
    "turno_id" INTEGER NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'MERCADOPAGO',
    "providerPaymentId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "preferenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_access_tokens" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "paciente_id" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "patient_access_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payments_turno_id_key" ON "payments"("turno_id");

-- CreateIndex
CREATE UNIQUE INDEX "patient_access_tokens_token_key" ON "patient_access_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_slug_key" ON "usuarios"("slug");

-- LIMPIEZA DE DUPLICADOS EXISTENTES (Deduplicación segura para permitir crear los índices)
WITH duplicates_dni AS (
  SELECT "id",
         ROW_NUMBER() OVER(PARTITION BY "usuario_id", "dni" ORDER BY "id" ASC) as rn
  FROM "pacientes"
  WHERE "dni" IS NOT NULL
)
UPDATE "pacientes"
SET "dni" = "dni" || '_dup_' || "id"
WHERE "id" IN (SELECT "id" FROM duplicates_dni WHERE rn > 1);

WITH duplicates_email AS (
  SELECT "id",
         ROW_NUMBER() OVER(PARTITION BY "usuario_id", "email" ORDER BY "id" ASC) as rn
  FROM "pacientes"
  WHERE "email" IS NOT NULL
)
UPDATE "pacientes"
SET "email" = "email" || '_dup_' || "id"
WHERE "id" IN (SELECT "id" FROM duplicates_email WHERE rn > 1);


-- Create índices parciales manualmente (Protección Legal de Deduplicación)
CREATE UNIQUE INDEX unique_paciente_dni ON "pacientes" ("usuario_id", "dni") WHERE "dni" IS NOT NULL;
CREATE UNIQUE INDEX unique_paciente_email ON "pacientes" ("usuario_id", "email") WHERE "email" IS NOT NULL;


-- AddForeignKey
ALTER TABLE "pacientes" ADD CONSTRAINT "pacientes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turnos" ADD CONSTRAINT "turnos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_rules" ADD CONSTRAINT "availability_rules_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_exceptions" ADD CONSTRAINT "availability_exceptions_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_turno_id_fkey" FOREIGN KEY ("turno_id") REFERENCES "turnos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_access_tokens" ADD CONSTRAINT "patient_access_tokens_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "pacientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_access_tokens" ADD CONSTRAINT "patient_access_tokens_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "pacientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
