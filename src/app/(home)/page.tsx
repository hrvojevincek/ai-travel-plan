import Image from "next/image";
import { getSession } from "@/features/auth";
import { SearchForm } from "@/features/home-search";

export default async function Home() {
  const session = await getSession();
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <Image src="/wings.avif" alt="" fill priority className="object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/70" />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-10">
        <Image
          src="/logo.svg"
          alt="Voyago"
          width={160}
          height={58}
          className="mb-5 drop-shadow-lg"
          priority
        />

        <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-4 rounded-xl border border-white/20 bg-white/10 p-5 shadow-2xl backdrop-blur-xl sm:max-w-md sm:p-6">
          <div className="text-center">
            <h1 className="text-balance text-2xl font-extrabold tracking-tight text-white drop-shadow-md sm:text-3xl">
              Let&apos;s <span className="text-primary">start</span> your
              journey
            </h1>
            <p className="mt-2 text-pretty text-xs text-white/80 sm:text-sm">
              Tell us where and how long. AI builds a full itinerary in seconds.
            </p>
          </div>

          <SearchForm showPreferences={!!session} />
        </div>
      </div>
    </div>
  );
}
