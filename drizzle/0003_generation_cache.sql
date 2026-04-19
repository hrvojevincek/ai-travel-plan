CREATE TABLE "generation_cache" (
	"id" text PRIMARY KEY NOT NULL,
	"destination_key" text NOT NULL,
	"duration" integer NOT NULL,
	"preferences_hash" text NOT NULL,
	"response" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_used_at" timestamp DEFAULT now() NOT NULL,
	"hit_count" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "generation_cache_key_uniq" ON "generation_cache" USING btree ("destination_key","duration","preferences_hash");