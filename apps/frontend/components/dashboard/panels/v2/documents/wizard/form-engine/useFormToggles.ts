import { useState } from 'react';
import type { DocumentSchema } from '../types';

export function useFormToggles(
  schema: DocumentSchema,
  initialToggles?: Record<string, boolean>,
) {
  const [copyToggles, setCopyToggles] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const section of schema.sections) {
      if (section.copyAddressToggle) {
        initial[section.key] = section.copyAddressToggle.defaultValue ?? true;
      }
    }
    return initial;
  });

  const [customToggles, setCustomToggles] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const section of schema.sections) {
      for (const toggle of section.toggles ?? []) {
        const key = `${section.key}:${toggle.key}`;
        initial[key] = initialToggles?.[key] ?? toggle.defaultValue ?? false;
      }
    }
    return initial;
  });

  function setCopyToggle(sectionKey: string, value: boolean) {
    setCopyToggles((current) => ({ ...current, [sectionKey]: value }));
  }

  function setCustomToggle(sectionKey: string, toggleKey: string, value: boolean) {
    setCustomToggles((current) => ({
      ...current,
      [`${sectionKey}:${toggleKey}`]: value,
    }));
  }

  return {
    copyToggles,
    customToggles,
    setCopyToggle,
    setCustomToggle,
  };
}
