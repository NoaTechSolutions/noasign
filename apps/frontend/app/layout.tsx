import type { Metadata } from "next";
import { AppProviders } from "../components/app-providers";
import { ChunkErrorHandler } from "../components/chunk-error-handler";
import "./globals.css";

export const metadata: Metadata = {
  title: "NTSsign",
  description: "NTSsign workspace for documents, workflows and billing.",
};

const themeInitScript = `
(function() {
  try {
    var path = window.location.pathname;
    var isDashboard = path === '/dashboard' || path.indexOf('/dashboard/') === 0 || path.indexOf('/dashboard?') === 0;
    if (isDashboard) {
      var t = localStorage.getItem('ntssign-dashboard-theme');
      if (t !== 'light' && t !== 'dark') {
        t = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      document.documentElement.setAttribute('data-theme', t);
    } else {
      var t = localStorage.getItem('nts-theme');
      if (t === 'dark') document.documentElement.classList.add('dark');
    }
  } catch(e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body suppressHydrationWarning>
        <ChunkErrorHandler />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
