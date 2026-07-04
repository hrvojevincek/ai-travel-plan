import { QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { makeQueryClient } from "@/lib/query/client";

export function createTestQueryClient() {
  return makeQueryClient();
}

export function QueryWrapper({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => createTestQueryClient());
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
