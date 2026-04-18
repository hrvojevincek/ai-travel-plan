ALTER TABLE "activity" ADD COLUMN "latitude" numeric(9, 6);--> statement-breakpoint
ALTER TABLE "activity" ADD COLUMN "longitude" numeric(9, 6);--> statement-breakpoint
ALTER TABLE "trip" ADD COLUMN "destination_lat" numeric(9, 6);--> statement-breakpoint
ALTER TABLE "trip" ADD COLUMN "destination_lng" numeric(9, 6);--> statement-breakpoint
ALTER TABLE "trip" ADD COLUMN "destination_place_id" text;--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "chk_activity_orderIndex_min" CHECK ("activity"."order_index" >= 0);--> statement-breakpoint
ALTER TABLE "day" ADD CONSTRAINT "chk_day_dayNumber_min" CHECK ("day"."day_number" >= 1);