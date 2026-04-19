import { notFound } from "next/navigation";
import { db } from "@/db/client";
import { requireAuth } from "@/features/auth";
import { getTrip } from "@/features/trips/data";
import { tripRowToPartial } from "@/features/trips/view";
import { TripDetailClient } from "./trip-detail-client";

export const metadata = { title: "Trip · Voyago" };

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireAuth();
  const row = await getTrip(db, id);
  if (!row || row.userId !== session.user.id) notFound();

  const trip = tripRowToPartial(row);
  const duration = row.days.length || 1;

  return (
    <TripDetailClient
      tripId={id}
      initialTrip={trip}
      expectedDays={duration}
      destination={row.destination}
      destinationLat={
        row.destinationLat != null ? Number(row.destinationLat) : null
      }
      destinationLng={
        row.destinationLng != null ? Number(row.destinationLng) : null
      }
    />
  );
}
