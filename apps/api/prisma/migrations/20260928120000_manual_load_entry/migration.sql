CREATE TYPE "AppointmentType" AS ENUM ('FCFS', 'BY_APPOINTMENT');

ALTER TABLE "Load"
  ADD COLUMN "customerName" TEXT,
  ADD COLUMN "billTo" TEXT,
  ADD COLUMN "operatingCompany" TEXT,
  ADD COLUMN "enteredByUserId" UUID,
  ADD COLUMN "enteredByName" TEXT,
  ADD COLUMN "bookedByName" TEXT,
  ADD COLUMN "bookedForTeam" TEXT,
  ADD COLUMN "bolNumber" TEXT,
  ADD COLUMN "pickupNumber" TEXT,
  ADD COLUMN "poNumber" TEXT,
  ADD COLUMN "consigneeReference" TEXT,
  ADD COLUMN "preloadedTrailer" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "preloadedTrailerNumber" TEXT,
  ADD COLUMN "driverPayAmount" TEXT,
  ADD COLUMN "driverPayMethod" TEXT;

ALTER TABLE "Stop"
  ADD COLUMN "appointmentType" "AppointmentType" NOT NULL DEFAULT 'FCFS',
  ADD COLUMN "appointmentStartAt" TIMESTAMPTZ(3),
  ADD COLUMN "appointmentEndAt" TIMESTAMPTZ(3);

CREATE TABLE "LoadCommodity" (
  "id" UUID NOT NULL,
  "loadId" UUID NOT NULL,
  "fromPosition" INTEGER NOT NULL,
  "toPosition" INTEGER NOT NULL,
  "commodity" TEXT NOT NULL,
  "description" TEXT,
  "weight" TEXT,
  "units" INTEGER,
  "pallets" INTEGER,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "LoadCommodity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LoadCommodity_loadId_idx" ON "LoadCommodity"("loadId");
ALTER TABLE "LoadCommodity"
  ADD CONSTRAINT "LoadCommodity_loadId_fkey"
  FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE CASCADE ON UPDATE CASCADE;
