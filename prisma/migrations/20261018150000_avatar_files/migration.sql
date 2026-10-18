-- Profile photos move from a data-URL column in "users" to their own table,
-- served by URL (/api/profile/avatar?v=<version>). Existing photos are carried over.

-- CreateTable
CREATE TABLE "avatars" (
    "user_id" UUID NOT NULL,
    "mime_type" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "avatars_pkey" PRIMARY KEY ("user_id")
);

-- AddForeignKey
ALTER TABLE "avatars" ADD CONSTRAINT "avatars_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatar_version" TEXT;

-- Carry existing photos over: 'data:image/jpeg;base64,...' -> mime type + bytes
INSERT INTO "avatars" ("user_id", "mime_type", "data")
SELECT "id",
       substring("avatar" from '^data:([a-z/]+);base64,'),
       decode(substring("avatar" from ',(.*)$'), 'base64')
FROM "users"
WHERE "avatar" ~ '^data:image/(jpeg|png|webp);base64,';

UPDATE "users" SET "avatar_version" = substr(md5(random()::text || "id"::text), 1, 12)
WHERE "id" IN (SELECT "user_id" FROM "avatars");

-- AlterTable
ALTER TABLE "users" DROP COLUMN "avatar";
