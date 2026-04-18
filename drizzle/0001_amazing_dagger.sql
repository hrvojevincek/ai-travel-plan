CREATE TYPE "public"."activity_type" AS ENUM('sightseeing', 'food', 'transport', 'accommodation', 'entertainment', 'shopping', 'other');--> statement-breakpoint
CREATE TABLE "activity" (
	"id" text PRIMARY KEY NOT NULL,
	"day_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" "activity_type" NOT NULL,
	"duration_minutes" integer,
	"address" text,
	"estimated_cost" numeric(10, 2),
	"order_index" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "day" (
	"id" text PRIMARY KEY NOT NULL,
	"trip_id" text NOT NULL,
	"day_number" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trip" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"destination" text NOT NULL,
	"summary" text,
	"total_estimated_cost" numeric(10, 2),
	"image_url" text,
	"image_attribution" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_day_id_day_id_fk" FOREIGN KEY ("day_id") REFERENCES "public"."day"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "day" ADD CONSTRAINT "day_trip_id_trip_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trip"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip" ADD CONSTRAINT "trip_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_dayId_idx" ON "activity" USING btree ("day_id");--> statement-breakpoint
CREATE UNIQUE INDEX "activity_dayId_orderIndex_uniq" ON "activity" USING btree ("day_id","order_index");--> statement-breakpoint
CREATE INDEX "day_tripId_idx" ON "day" USING btree ("trip_id");--> statement-breakpoint
CREATE UNIQUE INDEX "day_tripId_dayNumber_uniq" ON "day" USING btree ("trip_id","day_number");--> statement-breakpoint
CREATE INDEX "trip_userId_idx" ON "trip" USING btree ("user_id");