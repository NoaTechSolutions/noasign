export type Lang = "en" | "es";

export const copy = {
  nav: {
    howItWorks: { en: "How it works", es: "Cómo funciona" },
    pricing: { en: "Pricing", es: "Precios" },
    faq: { en: "FAQ", es: "FAQ" },
    login: { en: "Login", es: "Login" },
    cta: { en: "Request access", es: "Solicitar acceso" },
  },
  hero: {
    eyebrow: {
      en: ["e-signature", "contracts", "legal audit trail"],
      es: ["firma digital", "contratos", "audit trail legal"],
    },
    h1: {
      en: { pre: "Send contracts. Get them ", accent: "signed.", post: " Done." },
      es: { pre: "Envía contratos. Recibe ", accent: "firmas.", post: " Listo." },
    },
    subtitle: {
      en: "The document workspace for service businesses.\nNo printing, no scanning, no chasing clients.",
      es: "El workspace de documentos para negocios de servicios.\nSin imprimir, sin escanear, sin perseguir clientes.",
    },
    ctaPrimary: { en: "Request access", es: "Solicitar acceso" },
    ctaSecondary: { en: "See how it works", es: "Ver cómo funciona" },
    trust: {
      en: ["Legal e-signature", "ESIGN Act compliant", "Setup in 48h", "Cancel anytime"],
      es: ["Firma electrónica legal", "ESIGN Act compliant", "Setup en 48h", "Cancela cuando quieras"],
    },
  },
  problem: {
    title: { en: "Sound familiar?", es: "¿Te suena familiar?" },
    items: {
      en: [
        {
          icon: "📄",
          title: "You send the contract by email",
          desc: "They print it, sign it, photograph it, and send it back. Three days later.",
        },
        {
          icon: "📱",
          title: "You don't know if they opened it",
          desc: "No visibility. No notifications. No idea whether they signed or not.",
        },
        {
          icon: "📁",
          title: "You can't find the signed PDF",
          desc: "Your contract history is spread across emails, folders, and WhatsApp. Nowhere easy.",
        },
      ],
      es: [
        {
          icon: "📄",
          title: "Mandas el contrato por email",
          desc: "Lo imprimen, lo firman, le toman foto y te lo regresan. Tres días después.",
        },
        {
          icon: "📱",
          title: "No sabes si tu cliente lo abrió",
          desc: "Sin visibilidad. Sin notificaciones. Sin saber si firmaron o no.",
        },
        {
          icon: "📁",
          title: "No encuentras el PDF firmado",
          desc: "El historial de contratos está en emails, carpetas y WhatsApp. En ningún lugar fácil.",
        },
      ],
    },
  },
  howItWorks: {
    title: { en: "Three steps. Nothing more.", es: "Tres pasos. Nada más." },
    steps: {
      en: [
        { title: "Create your document", desc: "Fill in the guided form with your client's details. Done in minutes." },
        { title: "Send it to sign", desc: "Your client gets an email with a secure link. No account, no downloads." },
        { title: "Download the PDF", desc: "Real-time tracking. Signed PDF with full audit trail included." },
      ],
      es: [
        { title: "Crea tu documento", desc: "Llena el formulario guiado con los datos de tu cliente. Listo en minutos." },
        { title: "Envíalo a firmar", desc: "Tu cliente recibe un email con un link seguro. Sin cuenta, sin descargas." },
        { title: "Descarga el PDF", desc: "Tracking en tiempo real. PDF firmado con audit trail completo." },
      ],
    },
  },
  features: {
    title: {
      en: "Everything you need to close contracts faster",
      es: "Todo lo que necesitas para cerrar contratos más rápido",
    },
    items: {
      en: [
        { icon: "✍️", title: "Forms built for your business", desc: "Not a generic template. Your fields, your workflow, your process." },
        { icon: "📊", title: "Real-time tracking", desc: "Know exactly when your client opened the link and when they signed." },
        { icon: "🔔", title: "Automatic reminders", desc: "Stop chasing. NTSsign reminds your client for you." },
        { icon: "👥", title: "Team workspace", desc: "Your whole team sends and tracks from a single account." },
        { icon: "📋", title: "Legally binding signature", desc: "Every signature includes IP, timestamp, and certificate. ESIGN Act compliant." },
        { icon: "📁", title: "2-year document history", desc: "Find any signed contract, at any time." },
      ],
      es: [
        { icon: "✍️", title: "Formularios adaptados a tu negocio", desc: "No un template genérico. Tus campos, tu workflow, tu proceso." },
        { icon: "📊", title: "Tracking en tiempo real", desc: "Sabe exactamente cuándo tu cliente abrió el link y cuándo firmó." },
        { icon: "🔔", title: "Reminders automáticos", desc: "Deja de perseguir. NTSsign le recuerda a tu cliente por ti." },
        { icon: "👥", title: "Workspace de equipo", desc: "Todo tu equipo envía y hace seguimiento desde una sola cuenta." },
        { icon: "📋", title: "Firma electrónica legal", desc: "Cada firma incluye IP, timestamp y certificado. ESIGN Act compliant." },
        { icon: "📁", title: "Historial de 2 años", desc: "Encuentra cualquier contrato firmado, en cualquier momento." },
      ],
    },
  },
  pricing: {
    title: { en: "Plans for every stage of your business", es: "Planes para cada etapa de tu negocio" },
    monthly: { en: "Monthly", es: "Mensual" },
    annual: { en: "Annual", es: "Anual" },
    saveBadge: { en: "Save ~17%", es: "Ahorras ~17%" },
    note: {
      en: "All plans include: Signed PDF · Audit trail · ESIGN Act compliant · Email support",
      es: "Todos los planes incluyen: PDF firmado · Audit trail · ESIGN Act compliant · Soporte por email",
    },
    cta: { en: "Get started", es: "Empezar" },
    popular: { en: "Most popular", es: "Más popular" },
    extra: { en: "Extra", es: "Extra" },
    perDoc: { en: "/doc", es: "/doc" },
    perMonth: { en: "/mo", es: "/mes" },
    docs: { en: "docs/mo", es: "docs/mes" },
    users: { en: "users", es: "usuarios" },
    templates: { en: "templates", es: "templates" },
    history: { en: "history", es: "historial" },
    current: { en: "Current plan", es: "Plan actual" },
  },
  cta: {
    title: { en: "Ready to stop chasing signatures?", es: "¿Listo para dejar de perseguir firmas?" },
    subtitle: {
      en: "Set up your account in less than 48h. Your first template included.",
      es: "Configura tu cuenta en menos de 48h. Tu primer template incluido.",
    },
    primary: { en: "Request access", es: "Solicitar acceso" },
    secondary: { en: "See plans", es: "Ver planes" },
    trust: {
      en: ["No credit card required", "Cancel anytime", "A product by NTSolutions"],
      es: ["Sin tarjeta de crédito", "Cancela cuando quieras", "A product by NTSolutions"],
    },
  },
  footer: {
    links: {
      en: ["How it works", "Pricing", "FAQ", "Support", "Privacy Policy", "Terms of Service"],
      es: ["Cómo funciona", "Precios", "FAQ", "Soporte", "Política de privacidad", "Términos de servicio"],
    },
    note: {
      en: "A product by NTSolutions · noatechsolutions.com · support@noatechsolutions.com",
      es: "A product by NTSolutions · noatechsolutions.com · support@noatechsolutions.com",
    },
  },
} as const;

export function t<T>(obj: { en: T; es: T }, lang: Lang): T {
  return obj[lang];
}
