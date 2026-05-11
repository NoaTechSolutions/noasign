"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface ModuleLayoutProps {
  // Header
  title: string;
  description?: string;
  icon?: React.ReactNode;

  // Actions (top right)
  actions?: React.ReactNode;

  // Filters/Search bar (opcional)
  filters?: React.ReactNode;

  // Content
  children: React.ReactNode;

  // Variantes visuales
  variant?: "default" | "compact";

  // Loading state
  isLoading?: boolean;
}

export function ModuleLayout({
  title,
  description,
  icon,
  actions,
  filters,
  children,
  variant = "default",
  isLoading = false,
}: ModuleLayoutProps) {
  return (
    <div className="h-full flex flex-col">
      {/* Module Header */}
      <div
        className={cn(
          "flex items-start justify-between border-b border-[color:var(--border)] bg-white dark:bg-[#0f1628]",
          variant === "compact" ? "px-4 py-3" : "px-6 py-4",
        )}
      >
        <div className="flex items-start gap-3">
          {icon && <div className="mt-1">{icon}</div>}
          <div>
            <h1
              className={cn(
                "font-semibold text-[color:var(--text-primary)]",
                variant === "compact" ? "text-lg" : "text-2xl",
              )}
            >
              {title}
            </h1>
            {description && (
              <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
                {description}
              </p>
            )}
          </div>
        </div>

        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>

      {/* Filters (opcional) */}
      {filters && (
        <div className="border-b border-[color:var(--border)] bg-[color:var(--bg-surface)] px-6 py-3">
          {filters}
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-[color:var(--brand-accent)] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-sm text-[color:var(--text-muted)]">Loading...</p>
            </div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
