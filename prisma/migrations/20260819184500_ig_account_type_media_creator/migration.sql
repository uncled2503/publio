-- Meta's Instagram Graph API returns "MEDIA_CREATOR" for creator accounts,
-- not "CREATOR" — the original enum value was never actually correct
-- (confirmed against a live account on 2026-08-19). No rows use the old
-- value yet (OAuth connect was still failing on this exact mismatch).
ALTER TYPE "InstagramAccountType" RENAME VALUE 'CREATOR' TO 'MEDIA_CREATOR';
