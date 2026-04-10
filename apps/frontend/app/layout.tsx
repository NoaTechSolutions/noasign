import type { Metadata } from "next";
import { ThemeProvider } from "../components/theme-provider";
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
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ChunkErrorHandler />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
