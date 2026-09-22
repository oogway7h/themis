-- CreateEnum
CREATE TYPE "PresentedCredentialStatus" AS ENUM ('PENDING', 'BATCHED', 'INSERTED', 'REJECTED');

-- CreateTable
CREATE TABLE "presented_credentials" (
    "id" TEXT NOT NULL,
    "election_id" TEXT NOT NULL,
    "commitment" TEXT NOT NULL,
    "prepared_message" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "status" "PresentedCredentialStatus" NOT NULL DEFAULT 'PENDING',
    "presented_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "presented_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "presented_credentials_election_id_idx" ON "presented_credentials"("election_id");

-- CreateIndex
CREATE UNIQUE INDEX "presented_credentials_election_id_commitment_key" ON "presented_credentials"("election_id", "commitment");

-- AddForeignKey
ALTER TABLE "presented_credentials" ADD CONSTRAINT "presented_credentials_election_id_fkey" FOREIGN KEY ("election_id") REFERENCES "elections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
