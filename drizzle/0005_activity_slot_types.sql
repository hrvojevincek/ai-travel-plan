ALTER TABLE "activity" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."activity_type";--> statement-breakpoint
CREATE TYPE "public"."activity_type" AS ENUM('breakfast', 'lunch', 'dinner', 'activity');--> statement-breakpoint
ALTER TABLE "activity" ALTER COLUMN "type" SET DATA TYPE "public"."activity_type" USING (
  CASE
    WHEN "order_index" % 7 = 0 THEN 'breakfast'
    WHEN "order_index" % 7 = 3 THEN 'lunch'
    WHEN "order_index" % 7 = 6 THEN 'dinner'
    ELSE 'activity'
  END
)::"public"."activity_type";