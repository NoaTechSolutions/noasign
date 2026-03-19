import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NoaSign Login",
  description: "Modern login access for the NoaSign workspace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
