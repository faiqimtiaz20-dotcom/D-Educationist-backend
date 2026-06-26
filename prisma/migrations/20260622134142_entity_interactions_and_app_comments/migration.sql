-- CreateEnum
CREATE TYPE "InteractionKind" AS ENUM ('followup', 'appointment');

-- CreateTable
CREATE TABLE "entity_interactions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "kind" "InteractionKind" NOT NULL,
    "action" TEXT NOT NULL,
    "remarks" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL,
    "nextDate" TEXT,
    "nextTime" TEXT,
    "authorName" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entity_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_comments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "attachmentName" TEXT,
    "authorName" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "entity_interactions_tenantId_entityType_entityId_kind_idx" ON "entity_interactions"("tenantId", "entityType", "entityId", "kind");

-- CreateIndex
CREATE INDEX "application_comments_tenantId_applicationId_idx" ON "application_comments"("tenantId", "applicationId");

-- AddForeignKey
ALTER TABLE "entity_interactions" ADD CONSTRAINT "entity_interactions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_comments" ADD CONSTRAINT "application_comments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_comments" ADD CONSTRAINT "application_comments_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
