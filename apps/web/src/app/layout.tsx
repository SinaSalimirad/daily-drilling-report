import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Providers } from "@/shared/components/providers";

export const metadata: Metadata = { title: "Daily Mud Fluid Report" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: "2rem" }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
