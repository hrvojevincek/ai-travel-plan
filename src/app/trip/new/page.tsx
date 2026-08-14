import { Suspense } from "react";
import { TripNewClient } from "./trip-new-client";

export const metadata = { title: "Planning your trip" };

export default function TripNewPage() {
  return (
    <Suspense fallback={<TripNewFallback />}>
      <TripNewClient />
    </Suspense>
  );
}

function TripNewFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
      Loading…
    </div>
  );
}
