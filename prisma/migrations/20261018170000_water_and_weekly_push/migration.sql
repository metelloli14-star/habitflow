-- AlterTable
ALTER TABLE "users" ADD COLUMN     "water_reminders" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "weekly_summary" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "sent_notifications" (
    "user_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "sent_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sent_notifications_pkey" PRIMARY KEY ("user_id","key","date")
);

-- AddForeignKey
ALTER TABLE "sent_notifications" ADD CONSTRAINT "sent_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

