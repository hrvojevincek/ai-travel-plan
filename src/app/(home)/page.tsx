import SearchForm from "@/features/home-search";
import Image from "next/image";

export default function Home() {
  return (
    <div className="relative min-h-screen">
      <Image
        src="/wings.avif"
        alt=""
        fill
        priority
        className="object-cover"
      />
      <div className="flex flex-col justify-center items-center h-screen gap-10">

        <Image src="/logo.svg" alt="Voyago Logo" width={300} height={300} className="z-10" />
        <div className="relative w-[600px] h-[600px]">
          <div className="absolute rounded-full w-full h-full bg-opacity-10 backdrop-blur-md"></div>
          <div className="relative h-[600px] flex flex-col justify-center items-center z-10">
            <h2 className="inline-block w-96 font-extrabold text-center text-5xl mb-10 text-white drop-shadow-xl">
              Let's start your journey
            </h2>

            <div className="mt-4">
              <SearchForm />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
