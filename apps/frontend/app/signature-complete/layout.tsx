import { ThemeProvider } from "../../components/theme-provider";

/**
 * Theming for the public post-signature page.
 *
 * signature-complete has no provider of its own otherwise — it only inherits
 * the root layout, whose AppProviders does NOT mount next-themes. Without this
 * the <ThemeToggle/> (which calls next-themes' useTheme) is orphaned and
 * setTheme() is a no-op, so the toggle does nothing.
 *
 * Config follows docs/product/design-system.md §5:
 *  - attribute="class"     → globals.css drives dark via the `.dark` class
 *                            (@custom-variant dark (&:where(.dark, .dark *)))
 *  - storageKey            → persist under `ntssign-theme`
 *  - enableSystem          → respect prefers-color-scheme as the initial state
 *  - defaultTheme="system" → fall back to the OS preference when unset
 */
export default function SignatureCompleteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="ntssign-theme"
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
