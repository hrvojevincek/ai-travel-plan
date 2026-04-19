import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)]
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)]
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)]
);

export const activityType = pgEnum("activity_type", [
  "sightseeing",
  "food",
  "transport",
  "accommodation",
  "entertainment",
  "shopping",
  "other",
]);

export const trip = pgTable(
  "trip",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    destination: text("destination").notNull(),
    summary: text("summary"),
    totalEstimatedCost: numeric("total_estimated_cost", {
      precision: 10,
      scale: 2,
    }),
    imageUrl: text("image_url"),
    imageAttribution: text("image_attribution"),
    // Destination coords captured from Places Autocomplete at search time.
    // Used to center the map before activity pins load, and later to share
    // / link out. Nullable for trips saved before this feature landed.
    destinationLat: numeric("destination_lat", { precision: 9, scale: 6 }),
    destinationLng: numeric("destination_lng", { precision: 9, scale: 6 }),
    destinationPlaceId: text("destination_place_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("trip_userId_idx").on(table.userId)]
);

export const day = pgTable(
  "day",
  {
    id: text("id").primaryKey(),
    tripId: text("trip_id")
      .notNull()
      .references(() => trip.id, { onDelete: "cascade" }),
    dayNumber: integer("day_number").notNull(),
  },
  (table) => [
    index("day_tripId_idx").on(table.tripId),
    uniqueIndex("day_tripId_dayNumber_uniq").on(table.tripId, table.dayNumber),
    check("chk_day_dayNumber_min", sql`${table.dayNumber} >= 1`),
  ]
);

export const activity = pgTable(
  "activity",
  {
    id: text("id").primaryKey(),
    dayId: text("day_id")
      .notNull()
      .references(() => day.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    type: activityType("type").notNull(),
    durationMinutes: integer("duration_minutes"),
    address: text("address"),
    estimatedCost: numeric("estimated_cost", { precision: 10, scale: 2 }),
    // Map pin coords. Geocoded server-side in saveTrip (KRE-29). Nullable
    // because the geocoder can legitimately return no result for a bad
    // address — we still persist the activity, it just renders without a pin.
    latitude: numeric("latitude", { precision: 9, scale: 6 }),
    longitude: numeric("longitude", { precision: 9, scale: 6 }),
    orderIndex: integer("order_index").notNull(),
  },
  (table) => [
    index("activity_dayId_idx").on(table.dayId),
    uniqueIndex("activity_dayId_orderIndex_uniq").on(
      table.dayId,
      table.orderIndex
    ),
    check("chk_activity_orderIndex_min", sql`${table.orderIndex} >= 0`),
  ]
);

// Cache of AI trip generations keyed by (destination, duration, preferences).
// Same input reuses the stored response — includes geocoded activity coords so
// the map renders pins on first view without re-hitting Geocoding. See KRE-32.
export const generationCache = pgTable(
  "generation_cache",
  {
    id: text("id").primaryKey(),
    destinationKey: text("destination_key").notNull(),
    duration: integer("duration").notNull(),
    preferencesKey: text("preferences_key").notNull(),
    response: jsonb("response").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    lastUsedAt: timestamp("last_used_at").defaultNow().notNull(),
    hitCount: integer("hit_count").default(1).notNull(),
  },
  (table) => [
    uniqueIndex("generation_cache_key_uniq").on(
      table.destinationKey,
      table.duration,
      table.preferencesKey
    ),
  ]
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  trips: many(trip),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const tripRelations = relations(trip, ({ one, many }) => ({
  user: one(user, {
    fields: [trip.userId],
    references: [user.id],
  }),
  days: many(day),
}));

export const dayRelations = relations(day, ({ one, many }) => ({
  trip: one(trip, {
    fields: [day.tripId],
    references: [trip.id],
  }),
  activities: many(activity),
}));

export const activityRelations = relations(activity, ({ one }) => ({
  day: one(day, {
    fields: [activity.dayId],
    references: [day.id],
  }),
}));
