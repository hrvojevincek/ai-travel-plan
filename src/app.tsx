import QueryProvider from "@/components/query-provider";
import Image from "next/image";
import { Toaster } from "sonner";

function App() {
  return (
    <QueryProvider>
      <div className="relative min-h-screen">
        <Image src="/wings.avif" alt="" fill className="object-cover" />
        <div className="relative z-10 flex h-screen flex-col items-center justify-center gap-10">
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
                Let&apos;s start your journey
              </h2>

              <div className="mt-4"></div>
            </div>
          </div>
        </div>
        <Toaster />
      </div>
    </QueryProvider>
  );
}

export default App;
