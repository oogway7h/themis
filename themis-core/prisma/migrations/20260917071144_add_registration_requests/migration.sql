-- CreateEnum
CREATE TYPE "RegistrationRequestStatus" AS ENUM ('PENDING', 'QUEUED', 'BATCHED', 'INSERTED', 'REJECTED');

-- CreateTable
CREATE TABLE "registration_requests" (
    "id" TEXT NOT NULL,
    "election_id" TEXT NOT NULL,
    "scoped_token_hash" TEXT NOT NULL,
    "blinded_value" TEXT NOT NULL,
    "status" "RegistrationRequestStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registration_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "registration_requests_election_id_idx" ON "registration_requests"("election_id");

-- CreateIndex
CREATE UNIQUE INDEX "registration_requests_election_id_scoped_token_hash_key" ON "registration_requests"("election_id", "scoped_token_hash");

-- AddForeignKey
ALTER TABLE "registration_requests" ADD CONSTRAINT "registration_requests_election_id_fkey" FOREIGN KEY ("election_id") REFERENCES "elections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
