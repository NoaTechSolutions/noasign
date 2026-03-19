const stats = [
  { value: "SEO + UX", label: "Estructura pensada para posicionar y convertir" },
  { value: "Full funnel", label: "Desde identidad visual hasta automatizacion" },
  { value: "Escalable", label: "Base lista para ampliar servicios y landings" },
];

const services = [
  {
    title: "Diseno web premium",
    description:
      "Sitios con narrativa comercial, estructura limpia, performance alto y una presencia visual que eleva tu marca.",
  },
  {
    title: "SEO estrategico",
    description:
      "Arquitectura, copy y optimizacion tecnica para atraer trafico calificado con una base sostenible.",
  },
  {
    title: "Marketing digital",
    description:
      "Campanas, embudos y mensajes coordinados para convertir visitas en oportunidades reales.",
  },
  {
    title: "Branding y direccion visual",
    description:
      "Identidades consistentes para que cada punto de contacto se vea profesional, memorable y competitivo.",
  },
];

const pillars = [
  "Estrategia antes de disenar: cada seccion responde a un objetivo comercial.",
  "Sistema visual modular: la web queda lista para crecer por servicios y verticales.",
  "SEO desde la estructura: no como parche al final del proyecto.",
  "Tecnologia moderna: preparada para motion, componentes ricos y experiencias 3D ligeras.",
];

const process = [
  {
    step: "01",
    title: "Diagnostico y posicionamiento",
    detail:
      "Definimos propuesta de valor, servicios prioritarios, publico objetivo y direccion visual.",
  },
  {
    step: "02",
    title: "Arquitectura y contenido",
    detail:
      "Ordenamos navegacion, keywords, jerarquia H1-H2, CTAs y contenido comercial por pagina.",
  },
  {
    step: "03",
    title: "UI, motion y desarrollo",
    detail:
      "Construimos una experiencia visual premium, ligera y preparada para escalar.",
  },
  {
    step: "04",
    title: "SEO, analitica y optimizacion",
    detail:
      "Publicamos con medicion, mejoras tecnicas y una ruta clara de iteraciones posteriores.",
  },
];

const faqs = [
  {
    question: "Que hace competitiva a una web de agencia hoy?",
    answer:
      "Una propuesta de valor clara, una experiencia visual memorable, tiempos de carga controlados, SEO tecnico bien hecho y contenido que responda a intenciones de busqueda reales.",
  },
  {
    question: "Se pueden integrar efectos 3D sin perjudicar el rendimiento?",
    answer:
      "Si, siempre que se usen con criterio. El enfoque recomendado es concentrarlos en hero, showcases o bloques de impacto y no saturar toda la experiencia.",
  },
  {
    question: "Como se estructura la web para seguir agregando servicios?",
    answer:
      "Se diseña un sistema de componentes reutilizables y una arquitectura SEO modular para abrir nuevas paginas por servicio, industria o ubicacion sin rehacer la base.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: "NoaTechSolutions",
  url: "https://noatechsolutions.com",
  areaServed: "Mexico",
  serviceType: [
    "Diseno web",
    "SEO",
    "Marketing digital",
    "Branding",
  ],
  description:
    "Agencia de marketing, SEO y diseno web enfocada en crecimiento, conversion y experiencias digitales de alto impacto.",
};

export default function Home() {
  return (
    <main className="relative overflow-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="hero-orb hero-orb-left" aria-hidden="true" />
      <div className="hero-orb hero-orb-right" aria-hidden="true" />
      <div className="grid-shell section-space">
        <header className="surface-panel sticky top-4 z-20 mb-8 flex items-center justify-between gap-6 px-5 py-4 backdrop-blur">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--color-accent)]">
              NoaTechSolutions
            </p>
            <p className="text-sm text-[var(--color-muted)]">
              Marketing, SEO y experiencias web modernas
            </p>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-[var(--color-muted)] md:flex">
            <a href="#servicios" className="transition hover:text-white">
              Servicios
            </a>
            <a href="#proceso" className="transition hover:text-white">
              Proceso
            </a>
            <a href="#faq" className="transition hover:text-white">
              FAQ
            </a>
          </nav>
          <a href="#contacto" className="button-secondary">
            Agenda una consulta
          </a>
        </header>

        <section className="grid items-end gap-10 pb-14 pt-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-8">
            <span className="inline-flex rounded-full border border-white/12 bg-white/6 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-accent-soft)]">
              Rediseno estrategico por fases
            </span>
            <div className="space-y-5">
              <p className="eyebrow">Agencia creativa + tecnica</p>
              <h1 className="max-w-4xl font-display text-5xl leading-[0.96] tracking-[-0.04em] text-white sm:text-6xl lg:text-7xl">
                Creamos websites que se ven premium, se posicionan mejor y convierten con mas claridad.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-[var(--color-muted)] sm:text-xl">
                NoaTechSolutions combina branding, diseno web, SEO y marketing digital para construir una presencia competitiva, escalable y lista para crecer junto con tus servicios.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <a href="#contacto" className="button-primary">
                Planificar rediseno
              </a>
              <a href="#servicios" className="button-secondary">
                Explorar servicios
              </a>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {stats.map((stat) => (
                <article key={stat.label} className="metric-card">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                    {stat.value}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
                    {stat.label}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <aside className="surface-panel relative overflow-hidden p-6 sm:p-8">
            <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[var(--color-accent)] to-transparent" />
            <div className="grid gap-6">
              <div>
                <p className="eyebrow">Direccion recomendada</p>
                <h2 className="mt-3 font-display text-3xl tracking-[-0.03em] text-white">
                  Una web comercial con look premium y estructura SEO lista para expandirse.
                </h2>
              </div>
              <div className="space-y-4 text-sm leading-7 text-[var(--color-muted)]">
                {pillars.map((pillar) => (
                  <div
                    key={pillar}
                    className="rounded-3xl border border-white/8 bg-black/20 px-4 py-3"
                  >
                    {pillar}
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </section>

        <section
          id="servicios"
          className="section-divider grid gap-8 py-16 lg:grid-cols-[0.8fr_1.2fr]"
        >
          <div className="space-y-4">
            <p className="eyebrow">Servicios core</p>
            <h2 className="section-title">
              Una base que permite vender mas hoy y abrir nuevas lineas manana.
            </h2>
            <p className="section-copy">
              La web debe funcionar como activo comercial, no solo como presentacion. Por eso la estructura se plantea con modulos reutilizables y paginas listas para crecer por servicio, sector o ubicacion.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {services.map((service, index) => (
              <article key={service.title} className="service-card">
                <span className="service-index">0{index + 1}</span>
                <h3 className="mt-4 font-display text-2xl text-white">
                  {service.title}
                </h3>
                <p className="mt-4 text-sm leading-7 text-[var(--color-muted)]">
                  {service.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="section-divider grid gap-8 py-16 lg:grid-cols-[1fr_1fr]">
          <article className="surface-panel p-7 sm:p-8">
            <p className="eyebrow">Posicionamiento</p>
            <h2 className="mt-3 font-display text-3xl tracking-[-0.03em] text-white">
              El sitio debe hablarle a clientes que buscan una agencia seria, moderna y resolutiva.
            </h2>
            <p className="mt-5 text-base leading-8 text-[var(--color-muted)]">
              La ventaja no esta solo en el estilo visual. Esta en conectar identidad, arquitectura de informacion, copy comercial, SEO tecnico y una experiencia que deje claro por que su marca deberia elegirte.
            </p>
          </article>

          <article className="insight-panel">
            <div>
              <p className="eyebrow">Expansión</p>
              <h3 className="mt-3 font-display text-3xl tracking-[-0.03em] text-white">
                Preparada para efectos, motion y componentes avanzados.
              </h3>
            </div>
            <p className="text-base leading-8 text-[var(--color-muted)]">
              La primera fase debe concentrarse en narrativa, conversion, SEO y sistema visual. La segunda puede sumar motion avanzado, showcases 3D y recursos interactivos sin sacrificar rendimiento ni claridad.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="stat-tile">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-accent-soft)]">
                  Performance first
                </p>
                <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
                  Efectos solo donde mejoran percepcion y conversion.
                </p>
              </div>
              <div className="stat-tile">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-accent-soft)]">
                  Component driven
                </p>
                <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
                  Estructura lista para ampliar servicios sin rehacer la UI.
                </p>
              </div>
            </div>
          </article>
        </section>

        <section
          id="proceso"
          className="section-divider grid gap-8 py-16 lg:grid-cols-[0.8fr_1.2fr]"
        >
          <div className="space-y-4">
            <p className="eyebrow">Proceso recomendado</p>
            <h2 className="section-title">
              Llevemos el rediseno por fases para construir algo competitivo y sostenible.
            </h2>
          </div>
          <div className="grid gap-4">
            {process.map((item) => (
              <article key={item.step} className="process-card">
                <div className="flex items-start gap-5">
                  <span className="process-step">{item.step}</span>
                  <div>
                    <h3 className="font-display text-2xl text-white">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
                      {item.detail}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="section-divider py-16">
          <div className="surface-panel grid gap-8 p-7 sm:p-10 lg:grid-cols-[1fr_0.9fr]">
            <div>
              <p className="eyebrow">SEO comercial</p>
              <h2 className="mt-3 font-display text-3xl tracking-[-0.03em] text-white sm:text-4xl">
                Una homepage moderna tambien debe responder a la busqueda correcta.
              </h2>
            </div>
            <p className="text-base leading-8 text-[var(--color-muted)]">
              La nueva base incorpora contenido orientado a terminos como agencia de marketing, diseno web, SEO y marketing digital, pero organizado con criterio semantico para no sonar generico ni repetitivo. Esto permite crecer despues hacia paginas especificas por servicio y casos de uso.
            </p>
          </div>
        </section>

        <section
          id="faq"
          className="section-divider grid gap-8 py-16 lg:grid-cols-[0.8fr_1.2fr]"
        >
          <div className="space-y-4">
            <p className="eyebrow">Preguntas clave</p>
            <h2 className="section-title">
              Las decisiones visuales y tecnicas deben estar alineadas con negocio.
            </h2>
          </div>
          <div className="grid gap-4">
            {faqs.map((faq) => (
              <article key={faq.question} className="faq-card">
                <h3 className="font-display text-2xl text-white">{faq.question}</h3>
                <p className="mt-4 text-sm leading-7 text-[var(--color-muted)]">
                  {faq.answer}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section id="contacto" className="py-16">
          <div className="cta-panel">
            <div className="space-y-5">
              <p className="eyebrow">Siguiente paso</p>
              <h2 className="font-display text-4xl tracking-[-0.04em] text-white sm:text-5xl">
                Esta base ya puede convertirse en la primera fase de una web mucho mas fuerte.
              </h2>
              <p className="max-w-2xl text-base leading-8 text-[var(--color-muted)]">
                El siguiente movimiento correcto es aterrizar la paleta exacta de marca, priorizar servicios y construir las paginas estrategicas que van a generar autoridad y conversion.
              </p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row">
              <a href="mailto:hello@noatechsolutions.com" className="button-primary">
                Solicitar propuesta
              </a>
              <a href="https://noatechsolutions.com/" className="button-secondary">
                Ver sitio actual
              </a>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
