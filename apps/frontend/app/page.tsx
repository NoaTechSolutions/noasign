import { ThemeToggle } from "../components/theme-toggle";
import { LoginForm } from "./login-form";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[color:var(--background)] px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(180deg,var(--bg-page)_0%,var(--bg-page-subtle)_52%,var(--bg-surface)_100%)]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(5,165,255,0.08),_transparent_24%),radial-gradient(circle_at_80%_20%,_rgba(2,41,119,0.06),_transparent_18%),linear-gradient(135deg,rgba(5,165,255,0.02),transparent_35%)]" />
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-7xl items-center justify-center bg-transparent p-0 sm:p-3 lg:min-h-[calc(100vh-3rem)] lg:p-5">
        <div className="relative grid w-full overflow-hidden bg-transparent shadow-none sm:rounded-[2rem] sm:border sm:border-[color:var(--shell-border)] sm:bg-[image:var(--bg-shell-inner)] sm:shadow-[var(--shadow-strong)] md:grid-cols-[0.95fr_1.05fr] xl:grid-cols-[1.1fr_0.9fr] dark:sm:border-[color:var(--border-strong)]">
          <div className="absolute right-4 top-4 z-20 md:right-5 md:top-5">
            <ThemeToggle />
          </div>

          <section className="relative hidden min-h-[24rem] border-r border-[color:var(--border)] bg-[image:var(--bg-panel-soft)] p-6 md:block md:min-h-[38rem] md:p-7 lg:min-h-[42rem] lg:p-10">
            <div className="absolute left-[-6%] top-[-4%] h-40 w-40 rounded-full bg-[rgba(5,165,255,0.08)] blur-3xl sm:h-56 sm:w-56" />
            <div className="absolute bottom-[-10%] right-[-4%] h-52 w-52 rounded-full bg-[rgba(2,41,119,0.06)] blur-3xl sm:h-72 sm:w-72" />

            <div className="relative z-10 grid h-full gap-6">
              <div className="grid gap-3">
                <span className="inline-flex w-fit items-center rounded-full border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--brand-secondary)] shadow-[var(--shadow-soft)]">
                  Product preview
                </span>
                <div className="max-w-lg">
                  <h2 className="text-[2.2rem] font-semibold tracking-[-0.05em] text-[color:var(--brand-secondary)] md:text-[2.6rem] lg:text-[3.2rem] lg:leading-[0.98]">
                    Show the product with images or video.
                  </h2>
                  <p className="mt-3 max-w-md text-sm leading-6 text-[color:var(--text-secondary)]">
                    This area is reserved for product screenshots, workflow visuals, client proof, or a short demo video.
                  </p>
                </div>
              </div>

              <div className="grid flex-1 gap-4 lg:grid-rows-[1fr_auto]">
                <div className="grid min-h-[20rem] overflow-hidden rounded-[2rem] border border-[color:var(--border-strong)] bg-[image:var(--bg-card-elevated)] shadow-[var(--shadow-medium)]">
                  <div className="grid gap-4 bg-[linear-gradient(145deg,rgba(5,165,255,0.08),rgba(2,41,119,0.04))] p-4 sm:p-5">
                    <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                      <div className="rounded-[1.5rem] border border-[color:var(--border-strong)] bg-[image:var(--bg-shell-inner)] p-5 shadow-[var(--shadow-soft)]">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--text-muted)]">
                            Dashboard
                          </span>
                          <span className="rounded-full bg-[color:var(--badge-primary-bg)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--badge-primary-text)]">
                            Live flow
                          </span>
                        </div>
                        <div className="mt-5 grid gap-3">
                          <div className="h-4 w-30 rounded-full bg-[color:var(--brand-secondary)]/12" />
                          <div className="grid gap-2">
                            <div className="h-14 rounded-2xl bg-[color:var(--bg-surface)]" />
                            <div className="h-24 rounded-2xl bg-[linear-gradient(135deg,rgba(5,165,255,0.16),rgba(4,0,240,0.06))]" />
                            <div className="grid grid-cols-2 gap-2">
                              <div className="h-18 rounded-2xl bg-[color:var(--bg-surface)]" />
                              <div className="h-18 rounded-2xl bg-[color:var(--bg-surface)]" />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
                        <div className="rounded-[1.5rem] border border-[color:var(--border-strong)] bg-[image:var(--bg-card-elevated-strong)] p-4 shadow-[var(--shadow-soft)]">
                          <div className="h-24 rounded-[1.2rem] bg-[linear-gradient(135deg,var(--brand-secondary),var(--brand-accent-strong))]" />
                          <div className="mt-4 h-3 w-24 rounded-full bg-[color:var(--brand-secondary)]/12" />
                          <div className="mt-2 h-3 w-full rounded-full bg-[color:var(--bg-surface)]" />
                          <div className="mt-2 h-3 w-4/5 rounded-full bg-[color:var(--bg-surface)]" />
                        </div>
                        <div className="rounded-[1.5rem] border border-[color:var(--border-strong)] bg-[image:var(--bg-card-elevated-strong)] p-4 shadow-[var(--shadow-soft)]">
                          <div className="flex items-center justify-between">
                            <div className="h-3 w-20 rounded-full bg-[color:var(--brand-secondary)]/12" />
                            <div className="h-8 w-8 rounded-full bg-[color:var(--brand-highlight)]/18" />
                          </div>
                          <div className="mt-4 h-10 rounded-2xl bg-[color:var(--bg-surface)]" />
                          <div className="mt-3 h-10 rounded-2xl bg-[color:var(--bg-surface)]" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-[1.4rem] border border-[color:var(--border-strong)] bg-[color:var(--bg-elevated)] px-4 py-4 shadow-[var(--shadow-soft)]">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--text-muted)]">
                      Media slot
                    </div>
                    <div className="mt-2 text-sm font-medium text-[color:var(--text-primary)]">
                      Product image
                    </div>
                  </div>
                  <div className="rounded-[1.4rem] border border-[color:var(--border-strong)] bg-[color:var(--bg-elevated)] px-4 py-4 shadow-[var(--shadow-soft)]">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--text-muted)]">
                      Media slot
                    </div>
                    <div className="mt-2 text-sm font-medium text-[color:var(--text-primary)]">
                      Product gallery
                    </div>
                  </div>
                  <div className="rounded-[1.4rem] border border-[color:var(--border-strong)] bg-[color:var(--bg-elevated)] px-4 py-4 shadow-[var(--shadow-soft)]">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--text-muted)]">
                      Media slot
                    </div>
                    <div className="mt-2 text-sm font-medium text-[color:var(--text-primary)]">
                      Demo video
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="relative flex min-h-screen items-center bg-transparent p-4 sm:min-h-0 sm:bg-[image:var(--bg-form)] sm:p-5 md:p-6 lg:p-10">
            <div className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(5,165,255,0.03),transparent)]" />
            <div className="mx-auto grid w-full max-w-md gap-5 md:max-w-none md:gap-6">
              <LoginForm />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
