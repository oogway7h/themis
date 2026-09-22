-- CreateEnum
CREATE TYPE "ElectionStatus" AS ENUM ('BORRADOR', 'REGISTRO_ABIERTO', 'VOTACION_ABIERTA', 'CERRADA');

-- CreateTable
CREATE TABLE "elections" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "registro_inicio" TIMESTAMP(3) NOT NULL,
    "registro_fin" TIMESTAMP(3) NOT NULL,
    "votacion_inicio" TIMESTAMP(3) NOT NULL,
    "votacion_fin" TIMESTAMP(3) NOT NULL,
    "estado" "ElectionStatus" NOT NULL DEFAULT 'BORRADOR',
    "profundidad_arbol" INTEGER,
    "elegibilidad_facultad" "FacultadSso",
    "elegibilidad_carreras" "CarreraSso"[] DEFAULT ARRAY[]::"CarreraSso"[],
    "elegibilidad_tipo_usuario" "TipoUsuarioSso",
    "elegibilidad_estado_academico" "EstadoAcademicoSso",
    "padron_configurado_en" TIMESTAMP(3),
    "checkpoint_interval_minutes" INTEGER,
    "rate_limit_threshold_per_minute" INTEGER,
    "checkpoint_policy_configurado_en" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT NOT NULL,

    CONSTRAINT "elections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "options" (
    "id" TEXT NOT NULL,
    "election_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "authorities" (
    "id" TEXT NOT NULL,
    "election_id" TEXT NOT NULL,
    "platform_user_id" TEXT NOT NULL,
    "rol_descriptivo" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT NOT NULL,

    CONSTRAINT "authorities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "options_election_id_idx" ON "options"("election_id");

-- CreateIndex
CREATE INDEX "authorities_election_id_idx" ON "authorities"("election_id");

-- CreateIndex
CREATE UNIQUE INDEX "authorities_election_id_platform_user_id_key" ON "authorities"("election_id", "platform_user_id");

-- AddForeignKey
ALTER TABLE "options" ADD CONSTRAINT "options_election_id_fkey" FOREIGN KEY ("election_id") REFERENCES "elections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authorities" ADD CONSTRAINT "authorities_election_id_fkey" FOREIGN KEY ("election_id") REFERENCES "elections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authorities" ADD CONSTRAINT "authorities_platform_user_id_fkey" FOREIGN KEY ("platform_user_id") REFERENCES "platform_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
