// Deep validation for FormDefinition.schemaJson, anchored to the canonical
// DocumentSchema shape consumed by DocumentFormRenderer + the auto-calc engine.
//
// Canonical shape:
//   { sections: Array<{ key, label, fields: SchemaField[], copyAddressToggle?, toggles? }> }
//
// AutoCalculate canonical shape (frozen, do NOT migrate to "sources"):
//   { type: "sum"; fields: string[] } | { type: "copy"; source: string }

const VALID_FIELD_TYPES = [
  "text",
  "email",
  "phone",
  "date",
  "number",
  "currency",
  "textarea",
] as const;

const AUTO_CALC_COMPATIBLE_TYPES = new Set<string>(["currency", "number"]);

export type ValidationResult = { valid: boolean; errors: string[] };

export function validateDocumentSchema(schemaJson: string): ValidationResult {
  const errors: string[] = [];

  // 1. JSON parse
  let raw: unknown;
  try {
    raw = JSON.parse(schemaJson);
  } catch (e) {
    return {
      valid: false,
      errors: [`Invalid JSON: ${e instanceof Error ? e.message : "parse failed"}`],
    };
  }

  // 2. root must be an object with `sections`
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      valid: false,
      errors: ["Schema must be an object with a 'sections' property"],
    };
  }

  const root = raw as Record<string, unknown>;
  if (!("sections" in root)) {
    return {
      valid: false,
      errors: ["Schema is missing required 'sections' property"],
    };
  }

  // 3. sections is array
  const sections = root.sections;
  if (!Array.isArray(sections)) {
    return { valid: false, errors: ["'sections' must be an array"] };
  }

  if (sections.length === 0) {
    errors.push("'sections' is empty — at least one section is required");
  }

  // 4-7: structural pass. Build a global field map keyed by field.key for the
  // autoCalculate cross-references in the second pass.
  const fieldByKey = new Map<string, { type: string; sectionKey: string }>();
  const sectionKeys = new Set<string>();

  sections.forEach((section, s) => {
    const sLabel = `sections[${s}]`;

    if (section === null || typeof section !== "object" || Array.isArray(section)) {
      errors.push(`${sLabel} must be an object`);
      return;
    }

    const sec = section as Record<string, unknown>;
    const sKey = sec.key;
    const sLabelText = sec.label;
    const sFields = sec.fields;

    if (typeof sKey !== "string" || sKey.length === 0) {
      errors.push(`${sLabel} is missing 'key' (non-empty string)`);
    } else if (sectionKeys.has(sKey)) {
      errors.push(`Duplicate section key "${sKey}" (section keys must be unique)`);
    } else {
      sectionKeys.add(sKey);
    }

    if (typeof sLabelText !== "string" || sLabelText.length === 0) {
      errors.push(`${sLabel} is missing 'label' (non-empty string)`);
    }

    if (!Array.isArray(sFields)) {
      errors.push(`${sLabel}.fields must be an array`);
      return;
    }

    sFields.forEach((field, f) => {
      const fLabel = `${sLabel}.fields[${f}]`;

      if (field === null || typeof field !== "object" || Array.isArray(field)) {
        errors.push(`${fLabel} must be an object`);
        return;
      }

      const fld = field as Record<string, unknown>;
      const fKey = fld.key;
      const fLabelText = fld.label;
      const fType = fld.type;

      if (typeof fKey !== "string" || fKey.length === 0) {
        errors.push(`${fLabel} is missing 'key' (non-empty string)`);
      }

      if (typeof fLabelText !== "string" || fLabelText.length === 0) {
        errors.push(`${fLabel} is missing 'label' (non-empty string)`);
      }

      if (typeof fType !== "string") {
        errors.push(`${fLabel} is missing 'type' (string)`);
      } else if (!(VALID_FIELD_TYPES as readonly string[]).includes(fType)) {
        errors.push(
          `${fLabel}.type "${fType}" is invalid — must be one of: ${VALID_FIELD_TYPES.join(", ")}`,
        );
      }

      // Global field-key uniqueness (renderer state is keyed globally, not per-section)
      if (typeof fKey === "string" && fKey.length > 0) {
        if (fieldByKey.has(fKey)) {
          const prior = fieldByKey.get(fKey)!;
          errors.push(
            `${fLabel}.key "${fKey}" is also used in section "${prior.sectionKey}" — field keys must be globally unique`,
          );
        } else {
          fieldByKey.set(fKey, {
            type: typeof fType === "string" ? fType : "",
            sectionKey: typeof sKey === "string" ? sKey : "",
          });
        }
      }
    });
  });

  // 8-10: autoCalculate pass. Runs even if structural errors exist above —
  // surface as many problems as possible in one pass.
  sections.forEach((section, s) => {
    if (section === null || typeof section !== "object" || Array.isArray(section)) return;
    const sFields = (section as Record<string, unknown>).fields;
    if (!Array.isArray(sFields)) return;

    sFields.forEach((field, f) => {
      if (field === null || typeof field !== "object" || Array.isArray(field)) return;
      const fld = field as Record<string, unknown>;
      if (!("autoCalculate" in fld)) return;

      const fLabel = `sections[${s}].fields[${f}]`;
      const ac = fld.autoCalculate;
      const fKey = typeof fld.key === "string" ? fld.key : "";
      const fType = typeof fld.type === "string" ? fld.type : "";

      if (ac === null || typeof ac !== "object" || Array.isArray(ac)) {
        errors.push(`${fLabel}.autoCalculate must be an object`);
        return;
      }

      // (c) type compatibility — only currency/number can be auto-calculated
      if (fType.length > 0 && !AUTO_CALC_COMPATIBLE_TYPES.has(fType)) {
        errors.push(
          `${fLabel}.autoCalculate is only allowed on 'currency' or 'number' fields (got '${fType}')`,
        );
      }

      const acRec = ac as Record<string, unknown>;
      const acType = acRec.type;

      if (acType === "sum") {
        const refs = acRec.fields;
        if (!Array.isArray(refs)) {
          errors.push(`${fLabel}.autoCalculate.fields must be an array of field keys`);
          return;
        }
        refs.forEach((ref, i) => {
          if (typeof ref !== "string") {
            errors.push(`${fLabel}.autoCalculate.fields[${i}] must be a string`);
            return;
          }
          // (a) self-reference
          if (ref === fKey && fKey.length > 0) {
            errors.push(
              `${fLabel}.autoCalculate.fields includes its own key "${fKey}" (self-reference)`,
            );
          }
          // (10) referenced field exists
          if (!fieldByKey.has(ref)) {
            errors.push(
              `${fLabel}.autoCalculate.fields references unknown field "${ref}"`,
            );
          }
        });
      } else if (acType === "copy") {
        const src = acRec.source;
        if (typeof src !== "string") {
          errors.push(`${fLabel}.autoCalculate.source must be a string`);
          return;
        }
        // (a) self-reference
        if (src === fKey && fKey.length > 0) {
          errors.push(
            `${fLabel}.autoCalculate.source equals its own key "${fKey}" (self-reference)`,
          );
        }
        // (10) referenced field exists
        if (!fieldByKey.has(src)) {
          errors.push(`${fLabel}.autoCalculate.source references unknown field "${src}"`);
        }
      } else {
        errors.push(
          `${fLabel}.autoCalculate.type must be "sum" or "copy" (got ${JSON.stringify(acType)})`,
        );
      }
    });
  });

  return { valid: errors.length === 0, errors };
}
