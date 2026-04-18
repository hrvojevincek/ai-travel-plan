import Image from "next/image";
import { SearchForm } from "@/features/home-search";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <Image src="/wings.avif" alt="" fill priority className="object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/70" />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <Image
          src="/logo.svg"
          alt="Voyago"
          width={220}
          height={80}
          className="mb-8 drop-shadow-lg"
          priority
        />

        <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-8 rounded-2xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl sm:p-10">
          <div className="text-center">
            <h1 className="text-balance text-4xl font-extrabold tracking-tight text-white drop-shadow-md sm:text-5xl">
              Let&apos;s <span className="text-primary">start</span> your
              journey
            </h1>
            <p className="mt-3 text-pretty text-sm text-white/80 sm:text-base">
              Tell us where and how long. AI builds a full itinerary in seconds.
            </p>
          </div>

          <SearchForm />
        </div>
      </div>
    </div>
  );
}
