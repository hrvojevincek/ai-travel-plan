import { Suspense } from "react";
import { TripNewClient } from "./trip-new-client";

export const metadata = { title: "Planning your trip · Voyago" };

export default function TripNewPage() {
  return (
    <Suspense>
      <TripNewClient />
    </Suspense>
  );
}
