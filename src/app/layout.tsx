import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Launch Lab — Astronaut Trainer",
  description: "Explore a 3D outpost and learn astronaut survival systems through a deterministic training simulation.",
  applicationName: "Launch Lab"
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
