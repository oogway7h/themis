-- CreateEnum
CREATE TYPE "RegistrationBatchStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'INSERTED', 'INSERTION_FAILED');

-- CreateEnum
CREATE TYPE "RateAlertSeverity" AS ENUM ('WARNING');

-- AlterTable
ALTER TABLE "elections" ADD COLUMN     "last_checkpoint_closed_at" TIMESTAMP(3),
ADD COLUMN     "merkle_root" TEXT,
ADD COLUMN     "on_chain_group_created_at" TIMESTAMP(3),
ADD COLUMN     "on_chain_group_id" TEXT;

-- AlterTable
ALTER TABLE "presented_credentials" ADD COLUMN     "batch_id" TEXT;

-- CreateTable
CREATE TABLE "registration_batches" (
    "id" TEXT NOT NULL,
    "election_id" TEXT NOT NULL,
    "status" "RegistrationBatchStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "credential_count" INTEGER NOT NULL,
    "approvals_required" INTEGER NOT NULL,
    "merkle_root_before" TEXT,
    "merkle_root_after" TEXT,
    "on_chain_tx_hash" TEXT,
    "on_chain_group_id" TEXT,
    "closed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMP(3),
    "inserted_at" TIMESTAMP(3),
    "failure_reason" TEXT,

    CONSTRAINT "registration_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_approvals" (
    "id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "authority_id" TEXT NOT NULL,
    "platform_user_id" TEXT NOT NULL,
    "approved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "batch_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_alerts" (
    "id" TEXT NOT NULL,
    "election_id" TEXT NOT NULL,
    "window_start" TIMESTAMP(3) NOT NULL,
    "window_end" TIMESTAMP(3) NOT NULL,
    "registration_count" INTEGER NOT NULL,
    "threshold_per_minute" INTEGER NOT NULL,
    "severity" "RateAlertSeverity" NOT NULL DEFAULT 'WARNING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rate_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "registration_batches_election_id_status_idx" ON "registration_batches"("election_id", "status");

-- CreateIndex
CREATE INDEX "batch_approvals_batch_id_idx" ON "batch_approvals"("batch_id");

-- CreateIndex
CREATE UNIQUE INDEX "batch_approvals_batch_id_authority_id_key" ON "batch_approvals"("batch_id", "authority_id");

-- CreateIndex
CREATE INDEX "rate_alerts_election_id_created_at_idx" ON "rate_alerts"("election_id", "created_at");

-- CreateIndex
CREATE INDEX "presented_credentials_election_id_status_idx" ON "presented_credentials"("election_id", "status");

-- AddForeignKey
ALTER TABLE "presented_credentials" ADD CONSTRAINT "presented_credentials_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "registration_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_batches" ADD CONSTRAINT "registration_batches_election_id_fkey" FOREIGN KEY ("election_id") REFERENCES "elections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_approvals" ADD CONSTRAINT "batch_approvals_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "registration_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_approvals" ADD CONSTRAINT "batch_approvals_authority_id_fkey" FOREIGN KEY ("authority_id") REFERENCES "authorities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rate_alerts" ADD CONSTRAINT "rate_alerts_election_id_fkey" FOREIGN KEY ("election_id") REFERENCES "elections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
