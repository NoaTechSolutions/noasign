import { LoginForm } from "./login-form";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[color:var(--background)] px-3 py-3 sm:px-5 sm:py-5">
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(180deg,#f8fbff_0%,#eef4ff_28%,#e6f0ff_100%)]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(78,146,255,0.24),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(16,96,255,0.26),_transparent_28%),radial-gradient(circle_at_center,_rgba(255,255,255,0.72),_transparent_44%)]" />
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-6xl items-center justify-center rounded-[2rem] border border-white/55 bg-white/34 p-2 shadow-[0_32px_110px_rgba(47,96,176,0.16)] backdrop-blur sm:min-h-[calc(100vh-2.5rem)] sm:rounded-[2.25rem] sm:p-4">
        <div className="grid w-full overflow-hidden rounded-[1.7rem] border border-white/70 bg-white shadow-[0_22px_80px_rgba(53,105,193,0.16)] lg:grid-cols-[1.08fr_0.92fr]">
          <section className="relative flex min-h-[23rem] flex-col justify-between overflow-hidden bg-[linear-gradient(155deg,#1767ff_0%,#0f4ddf_44%,#0a37bc_100%)] p-5 text-white sm:min-h-[28rem] sm:p-7 lg:min-h-[40rem] lg:p-10">
            <div className="absolute inset-x-[-8%] top-[-12%] h-40 rounded-full bg-white/16 blur-3xl sm:h-56" />
            <div className="absolute bottom-[-18%] left-[-8%] h-44 w-44 rounded-full border border-white/16 bg-white/8 blur-2xl sm:h-64 sm:w-64" />
            <div className="relative z-10 flex items-center justify-between gap-4">
              <div className="inline-flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-base font-bold tracking-[-0.04em] text-[#0f4ddf] shadow-[0_10px_25px_rgba(7,33,98,0.2)]">
                  N
                </span>
                <div>
                  <div className="text-lg font-semibold tracking-[-0.04em]">
                    NoaSign
                  </div>
                  <div className="text-xs text-white/72 sm:text-sm">
                    Document workflow
                  </div>
                </div>
              </div>
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/76 sm:text-[11px]">
                SaaS
              </span>
            </div>

            <div className="relative z-10 grid gap-6">
              <div className="mx-auto grid h-40 w-full max-w-[19rem] place-items-center rounded-[2rem] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.04))] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] sm:h-52 sm:max-w-[22rem]">
                <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-white shadow-[0_16px_50px_rgba(7,33,98,0.28)] sm:h-36 sm:w-36">
                  <div className="absolute h-20 w-20 rounded-full border-[10px] border-[#1560f6] bg-white sm:h-24 sm:w-24" />
                  <div className="absolute h-5 w-5 rounded-full bg-[#ff8d58] shadow-[0_0_0_8px_rgba(255,141,88,0.18)]" />
                  <div className="absolute left-1/2 top-1/2 h-1 w-16 origin-left -translate-y-1/2 rotate-[-35deg] rounded-full bg-[#1560f6] sm:w-20" />
                  <div className="absolute left-[66%] top-[32%] h-3 w-3 rounded-full bg-[#7fd0ff]" />
                </div>
              </div>

              <div className="grid gap-3 text-center lg:text-left">
                <h2 className="text-3xl font-semibold tracking-[-0.05em] sm:text-[3rem] sm:leading-[1.02]">
                  Keep signing ops clear.
                </h2>
                <p className="mx-auto max-w-sm text-sm leading-6 text-white/76 lg:mx-0">
                  Contracts, quotes and invoices in one controlled flow.
                </p>
              </div>
            </div>

            <div className="relative z-10 flex items-center justify-center gap-3 lg:justify-start">
              <span className="h-2.5 w-2.5 rounded-full bg-white/42" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/42" />
              <span className="h-2.5 w-2.5 rounded-full bg-white" />
            </div>
          </section>

          <section className="flex items-center bg-[linear-gradient(180deg,#ffffff_0%,#f7faff_100%)] p-4 sm:p-6 lg:p-8">
            <LoginForm />
          </section>
        </div>
      </div>
    </main>
  );
}
