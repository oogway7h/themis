-- CreateTable
CREATE TABLE "ping_log" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ping_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ping_log_createdAt_idx" ON "ping_log"("createdAt");
