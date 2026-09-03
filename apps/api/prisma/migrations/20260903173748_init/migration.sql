-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'DISPATCHER', 'DRIVER', 'ACCOUNTING', 'SAFETY');

-- CreateEnum
CREATE TYPE "LoadStatus" AS ENUM ('DRAFT', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "StopType" AS ENUM ('PICKUP', 'DELIVERY');

-- CreateEnum
CREATE TYPE "DocumentKind" AS ENUM ('RATE_CONFIRMATION', 'POD', 'OTHER');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Load" (
    "id" UUID NOT NULL,
    "sequenceNumber" INTEGER,
    "internalLoadId" TEXT,
    "brokerLoadNumber" TEXT,
    "status" "LoadStatus" NOT NULL DEFAULT 'DRAFT',
    "assignedDriverId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Load_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stop" (
    "id" UUID NOT NULL,
    "loadId" UUID NOT NULL,
    "type" "StopType" NOT NULL,
    "position" INTEGER NOT NULL,
    "facilityName" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "countryCode" CHAR(2) NOT NULL DEFAULT 'US',
    "appointmentAt" TIMESTAMPTZ(3),
    "referenceNumber" TEXT,
    "instructions" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Stop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoadDocument" (
    "id" UUID NOT NULL,
    "loadId" UUID NOT NULL,
    "kind" "DocumentKind" NOT NULL,
    "version" INTEGER NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoadDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoadFieldVisibility" (
    "id" UUID NOT NULL,
    "loadId" UUID NOT NULL,
    "field" TEXT NOT NULL,
    "visibleToDriver" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "LoadFieldVisibility_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Load_sequenceNumber_key" ON "Load"("sequenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Load_internalLoadId_key" ON "Load"("internalLoadId");

-- CreateIndex
CREATE UNIQUE INDEX "Stop_loadId_position_key" ON "Stop"("loadId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "LoadDocument_storageKey_key" ON "LoadDocument"("storageKey");

-- CreateIndex
CREATE UNIQUE INDEX "LoadDocument_loadId_kind_version_key" ON "LoadDocument"("loadId", "kind", "version");

-- CreateIndex
CREATE UNIQUE INDEX "LoadFieldVisibility_loadId_field_key" ON "LoadFieldVisibility"("loadId", "field");

-- AddForeignKey
ALTER TABLE "Load" ADD CONSTRAINT "Load_assignedDriverId_fkey" FOREIGN KEY ("assignedDriverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stop" ADD CONSTRAINT "Stop_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadDocument" ADD CONSTRAINT "LoadDocument_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadFieldVisibility" ADD CONSTRAINT "LoadFieldVisibility_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE CASCADE ON UPDATE CASCADE;
