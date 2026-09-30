-- vote_receipts (modelo VoteReceipt, recibo de POST /elections/:id/votes, el
-- endpoint que usa la app) estaba en schema.prisma sin migracion: existia solo
-- en bases creadas con `prisma db push`, y en una base nueva el voto fallaba
-- con P2021. Idempotente para no romper esas bases, que ya tienen la tabla.
CREATE TABLE IF NOT EXISTS "vote_receipts" (
    "id" TEXT NOT NULL,
    "election_id" TEXT NOT NULL,
    "option_id" TEXT NOT NULL,
    "nullifier" TEXT NOT NULL,
    "tx_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vote_receipts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "vote_receipts_nullifier_key" ON "vote_receipts"("nullifier");

CREATE INDEX IF NOT EXISTS "vote_receipts_election_id_idx" ON "vote_receipts"("election_id");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vote_receipts_election_id_fkey') THEN
    ALTER TABLE "vote_receipts" ADD CONSTRAINT "vote_receipts_election_id_fkey" FOREIGN KEY ("election_id") REFERENCES "elections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vote_receipts_option_id_fkey') THEN
    ALTER TABLE "vote_receipts" ADD CONSTRAINT "vote_receipts_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "options"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
