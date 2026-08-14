import type { Metadata } from "next";
import { Hind } from "next/font/google";
import "./globals.css";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "sonner";
import QueryProvider from "@/components/query-provider";
import { MapsApiProvider } from "@/features/maps";

const hind = Hind({
  variable: "--font-hind",
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "AI Voyago",
    template: "%s · Voyago",
  },
  description: "AI Voyago travel planner",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={hind.variable}>
      <body className={`${hind.className} antialiased`}>
        <QueryProvider>
          <NuqsAdapter>
            <MapsApiProvider>
              {children} <Toaster />
            </MapsApiProvider>
          </NuqsAdapter>
        </QueryProvider>
      </body>
    </html>
  );
}
