import { LoginForm } from "./login-form";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[color:var(--background)] px-4 py-4 sm:px-6 sm:py-6">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(212,103,48,0.20),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(20,80,122,0.22),_transparent_28%),linear-gradient(180deg,_#fbf6ef_0%,_#f1eee8_100%)]" />
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-6xl gap-6 rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-4 shadow-[0_35px_100px_rgba(13,26,38,0.16)] backdrop-blur sm:p-6 lg:grid-cols-[1.1fr_0.9fr] lg:p-7">
        <section className="flex min-h-[22rem] flex-col justify-between rounded-[1.75rem] bg-[linear-gradient(145deg,#16344c_0%,#0f2538_55%,#0d1a26_100%)] p-6 text-white sm:p-8">
          <div className="grid gap-12">
            <div className="flex items-center justify-between gap-4">
              <div className="inline-flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-lg font-semibold tracking-[-0.04em]">
                  N
                </span>
                <div>
                  <div className="text-lg font-semibold tracking-[-0.04em]">
                    NoaSign
                  </div>
                  <div className="text-sm text-white/62">Document operations</div>
                </div>
              </div>
              <span className="rounded-full border border-white/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/62">
                Beta foundation
              </span>
            </div>

            <div className="grid gap-5">
              <h2 className="max-w-xl text-balance text-3xl font-semibold tracking-[-0.05em] sm:text-4xl lg:text-[3.6rem] lg:leading-[1.02]">
                Contracts, billing and workflow state in one place.
              </h2>
              <p className="max-w-xl text-sm leading-7 text-white/76 sm:text-base">
                Built for service businesses that need more control than email
                threads, loose PDFs and disconnected signature tools.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Metric value="Multi-tenant" label="company-aware foundation" />
            <Metric value="Usage billing" label="monthly control by sent docs" />
            <Metric value="PandaDoc-ready" label="integration block comes next" />
          </div>
        </section>

        <section className="flex items-center rounded-[1.75rem] bg-[color:var(--surface)] p-4 sm:p-5">
          <LoginForm />
        </section>
      </div>
    </main>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/6 p-4 backdrop-blur">
      <div className="text-sm font-semibold text-white">{value}</div>
      <div className="mt-1 text-xs leading-5 text-white/60">{label}</div>
    </div>
  );
}
