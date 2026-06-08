import React from 'react';

/**
 * Shared "Set A" finance palette + card shell — the SINGLE source of truth for
 * the numbered Finance cards (①②③④) used in BOTH the document detail/edit modal
 * and the creation wizard. Keeping colors + card chrome here guarantees the two
 * surfaces stay visually identical.
 */
export interface FinanceColor {
  color: string;
  bg: string;
  border: string;
  label: string;
}

export const FINANCE_COLORS: Record<number, FinanceColor> = {
  1: { color: '#05a5ff', bg: 'rgba(5,165,255,0.06)', border: 'rgba(5,165,255,0.25)', label: '①' },
  2: { color: '#ff9900', bg: 'rgba(255,153,0,0.06)', border: 'rgba(255,153,0,0.25)', label: '②' },
  3: { color: '#10b981', bg: 'rgba(16,185,129,0.06)', border: 'rgba(16,185,129,0.25)', label: '③' },
  4: { color: '#a855f7', bg: 'rgba(168,85,247,0.06)', border: 'rgba(168,85,247,0.25)', label: '④' },
};

export interface CardAccent {
  color: string;
  bg: string;
  border: string;
}

// Neutral (slate) accent for the Contract card — same chrome as the finance
// cards, distinct hue since it's the base group, not a numbered entry.
export const CONTRACT_ACCENT: CardAccent = {
  color: 'var(--text-heading)',
  bg: 'rgba(148,163,184,0.06)',
  border: 'rgba(148,163,184,0.25)',
};

/**
 * Colored card with an accented header (optional numbered badge). Styles are
 * inline (matching the former .gep-finance-group / .gep-finance-header /
 * .gep-finance-badge CSS) so the shell is self-contained and portable across
 * the modal + wizard without coupling to either's stylesheet. Children are the
 * card's inputs/rows.
 */
export function PricingCard({
  accent,
  badge,
  title,
  children,
}: {
  accent: CardAccent;
  badge?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: accent.bg,
        border: `1px solid ${accent.border}`,
        borderRadius: '10px',
        padding: '12px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
          fontWeight: 500,
          padding: '0 0 8px',
          color: accent.color,
        }}
      >
        {badge ? <span style={{ fontSize: '14px', fontWeight: 600 }}>{badge}</span> : null}
        <span>{title}</span>
      </div>
      {children}
    </div>
  );
}

/** Numbered Finance card (①②③④) — thin wrapper over PricingCard. */
export function FinanceCard({
  index,
  title,
  children,
}: {
  index: number;
  title?: string;
  children: React.ReactNode;
}) {
  const c = FINANCE_COLORS[index];
  return (
    <PricingCard accent={c} badge={c.label} title={title ?? `Finance ${index}`}>
      {children}
    </PricingCard>
  );
}
