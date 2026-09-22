-- CreateEnum
CREATE TYPE "VoteSubmissionSource" AS ENUM ('RELAY', 'CHAIN_SYNC');

-- AlterTable (nullable first, backfilled below, then locked NOT NULL)
ALTER TABLE "options" ADD COLUMN     "on_chain_index" INTEGER;

-- Backfill on_chain_index in creation order per election (CU-10)
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY election_id ORDER BY created_at ASC, id ASC) - 1 AS rn
  FROM "options"
)
UPDATE "options" o SET "on_chain_index" = ranked.rn FROM ranked WHERE ranked.id = o.id;

ALTER TABLE "options" ALTER COLUMN "on_chain_index" SET NOT NULL;

-- AlterTable
ALTER TABLE "registration_batches" ADD COLUMN     "on_chain_member_commitments" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "vote_submissions" (
    "id" TEXT NOT NULL,
    "election_id" TEXT NOT NULL,
    "option_id" TEXT NOT NULL,
    "nullifier" TEXT NOT NULL,
    "merkle_tree_root" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "on_chain_tx_hash" TEXT,
    "block_number" INTEGER,
    "source" "VoteSubmissionSource" NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vote_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chain_sync_state" (
    "id" TEXT NOT NULL,
    "election_id" TEXT NOT NULL,
    "last_synced_block" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chain_sync_state_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "election_results" (
    "id" TEXT NOT NULL,
    "election_id" TEXT NOT NULL,
    "total_votes" INTEGER NOT NULL,
    "final_merkle_root" TEXT NOT NULL,
    "source_block_number" INTEGER NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "election_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "election_result_options" (
    "id" TEXT NOT NULL,
    "election_result_id" TEXT NOT NULL,
    "option_id" TEXT NOT NULL,
    "vote_count" INTEGER NOT NULL,

    CONSTRAINT "election_result_options_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vote_submissions_election_id_option_id_idx" ON "vote_submissions"("election_id", "option_id");

-- CreateIndex
CREATE UNIQUE INDEX "vote_submissions_election_id_nullifier_key" ON "vote_submissions"("election_id", "nullifier");

-- CreateIndex
CREATE UNIQUE INDEX "chain_sync_state_election_id_key" ON "chain_sync_state"("election_id");

-- CreateIndex
CREATE UNIQUE INDEX "election_results_election_id_key" ON "election_results"("election_id");

-- CreateIndex
CREATE UNIQUE INDEX "election_result_options_election_result_id_option_id_key" ON "election_result_options"("election_result_id", "option_id");

-- CreateIndex
CREATE UNIQUE INDEX "options_election_id_on_chain_index_key" ON "options"("election_id", "on_chain_index");

-- AddForeignKey
ALTER TABLE "vote_submissions" ADD CONSTRAINT "vote_submissions_election_id_fkey" FOREIGN KEY ("election_id") REFERENCES "elections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vote_submissions" ADD CONSTRAINT "vote_submissions_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "options"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chain_sync_state" ADD CONSTRAINT "chain_sync_state_election_id_fkey" FOREIGN KEY ("election_id") REFERENCES "elections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "election_results" ADD CONSTRAINT "election_results_election_id_fkey" FOREIGN KEY ("election_id") REFERENCES "elections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "election_result_options" ADD CONSTRAINT "election_result_options_election_result_id_fkey" FOREIGN KEY ("election_result_id") REFERENCES "election_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "election_result_options" ADD CONSTRAINT "election_result_options_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "options"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
