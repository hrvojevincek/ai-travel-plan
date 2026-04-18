import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="relative min-h-screen">
      <Image src="/wings.avif" alt="" fill priority className="object-cover" />
      <div className="flex h-screen flex-col items-center justify-center gap-10">
        <Image
          src="/logo.svg"
          alt="Voyago Logo"
          width={300}
          height={300}
          className="z-10"
        />
        <div className="relative h-[600px] w-[600px]">
          <div className="bg-opacity-10 absolute h-full w-full rounded-full backdrop-blur-md"></div>
          <div className="relative z-10 flex h-[600px] flex-col items-center justify-center">
            <h2 className="mb-10 inline-block w-96 text-center text-5xl font-extrabold text-white drop-shadow-xl">
              Let&apos;s <span className="text-primary">start</span> your
              journey
            </h2>

            <div className="mt-4">{/* <SearchForm /> */}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
