-- Persist one activity marker per user and calendar day for streak calculations.
CREATE TABLE "ActivityDay" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityDay_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ActivityDay_userId_date_key" ON "ActivityDay"("userId", "date");
CREATE INDEX "ActivityDay_userId_date_idx" ON "ActivityDay"("userId", "date");

ALTER TABLE "ActivityDay" ADD CONSTRAINT "ActivityDay_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
