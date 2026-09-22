-- CreateEnum
CREATE TYPE "FacultadSso" AS ENUM ('FICCT');

-- CreateEnum
CREATE TYPE "CarreraSso" AS ENUM ('INGENIERIA_SISTEMAS', 'INGENIERIA_INFORMATICA', 'INGENIERIA_REDES_TELECOMUNICACIONES', 'INGENIERIA_ROBOTICA');

-- CreateEnum
CREATE TYPE "TipoUsuarioSso" AS ENUM ('ESTUDIANTE', 'DOCENTE', 'ADMINISTRATIVO');

-- CreateEnum
CREATE TYPE "EstadoAcademicoSso" AS ENUM ('ACTIVO', 'INACTIVO');

-- CreateTable
CREATE TABLE "mock_sso_users" (
    "id" TEXT NOT NULL,
    "codigo_institucional" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "nombre_completo" TEXT NOT NULL,
    "facultad" "FacultadSso" NOT NULL,
    "carrera" "CarreraSso" NOT NULL,
    "tipo_usuario" "TipoUsuarioSso" NOT NULL,
    "estado_academico" "EstadoAcademicoSso" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mock_sso_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mock_sso_users_codigo_institucional_key" ON "mock_sso_users"("codigo_institucional");
