import { ThemeProvider } from "../../components/theme-provider";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      <div className="app-shell">{children}</div>
    </ThemeProvider>
  );
}
