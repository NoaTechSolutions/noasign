import type { Metadata } from "next";
import { ChunkErrorHandler } from "../components/chunk-error-handler";
import "./globals.css";

export const metadata: Metadata = {
  title: "NTSsign",
  description: "NTSsign workspace for documents, workflows and billing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ChunkErrorHandler />
        {children}
      </body>
    </html>
  );
}
