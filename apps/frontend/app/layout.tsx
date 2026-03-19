import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://noatechsolutions.com"),
  title: {
    default: "NoaTechSolutions | Agencia de marketing, SEO y diseno web",
    template: "%s | NoaTechSolutions",
  },
  description:
    "Agencia de marketing, SEO y diseno web enfocada en crecimiento, conversion y experiencias digitales de alto impacto.",
  keywords: [
    "agencia de marketing",
    "diseno web",
    "seo",
    "marketing digital",
    "branding",
    "desarrollo web",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "NoaTechSolutions | Agencia de marketing, SEO y diseno web",
    description:
      "Creamos sitios web modernos, estrategias SEO y experiencias digitales pensadas para competir y convertir.",
    url: "https://noatechsolutions.com",
    siteName: "NoaTechSolutions",
    locale: "es_MX",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NoaTechSolutions",
    description:
      "Marketing, SEO y diseno web con enfoque premium, tecnico y orientado a resultados.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full scroll-smooth">
      <body className="min-h-full bg-[var(--color-ink)] text-[var(--color-paper)] antialiased">
        {children}
      </body>
    </html>
  );
}
