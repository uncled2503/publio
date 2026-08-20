-- Manual delete now purges storage + row immediately (was soft-delete
-- only). Media that's been used in a fully published post gets a 3-day
-- countdown to auto-purge instead, unless marked deletionExempt.
ALTER TABLE "media_assets" ADD COLUMN "scheduledDeletionAt" TIMESTAMP(3);
ALTER TABLE "media_assets" ADD COLUMN "deletionExempt" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "media_assets_scheduledDeletionAt_idx" ON "media_assets"("scheduledDeletionAt");

-- Purging a MediaAsset now cascades to drop its PostMedia usage rows
-- instead of being blocked by them (the post itself, and its
-- externalPermalink, survive independently of our own media copy).
ALTER TABLE "post_media" DROP CONSTRAINT "post_media_mediaAssetId_fkey";
ALTER TABLE "post_media" ADD CONSTRAINT "post_media_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "media_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
