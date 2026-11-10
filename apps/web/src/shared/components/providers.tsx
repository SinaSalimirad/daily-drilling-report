"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { queryClient } from "@/lib/query-client";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(queryClient);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
