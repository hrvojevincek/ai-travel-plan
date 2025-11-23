import type { Metadata } from "next";
import { Hind } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/components/query-provider";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "sonner";

const hind = Hind({
  variable: "--font-hind",
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Voyago",
  description: "AI Voyago travel planner",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${hind.variable} antialiased`}
      >
        <QueryProvider>
          <NuqsAdapter>
              {children} <Toaster />
          </NuqsAdapter>
        </QueryProvider>
      </body>
    </html>
  );
}
