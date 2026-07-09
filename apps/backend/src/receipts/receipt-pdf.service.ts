import { Injectable } from '@nestjs/common';
import {
  degrees,
  PDFDocument,
  PDFFont,
  PDFPage,
  PDFTextField,
  rgb,
} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Generic, template-driven receipt PDF generator. Coordinates + the base PDF
 * live in the ReceiptTemplate (DB), NOT in code — adding a new client is a new
 * row, not a code change. Validated to render pixel-identical to the approved
 * World Pavers preview (mediaBoxOffsetY=7.92, full font embed).
 */

export type ReceiptFieldType =
  | 'text'
  | 'currency'
  | 'checkbox_group'
  | 'signature_image';

export interface ReceiptFieldMapping {
  type: ReceiptFieldType;
  x?: number;
  lineTop?: number;
  baseline?: number;
  gap?: number;
  font?: string;
  size?: number;
  color?: string;
  autoShiftRightLimit?: number;
  mark?: string;
  options?: Record<string, number>;
  // For a `text` field whose value is an enum (e.g. payment_method rendered as
  // text instead of a checkbox_group): maps the raw value to a friendly label
  // ("CREDIT_DEBIT_CARD" -> "Credit/Debit Card"). Falls back to the raw value.
  labels?: Record<string, string>;
  // AcroForm mode only: the named form field to fill (defaults to the data key).
  field?: string;
  // AcroForm mode only: enable multi-line text in the field box.
  multiline?: boolean;
  // For a `signature_image` field: box (points) the PNG is drawn into. lineTop is
  // the box's TOP; w/h its size. The image source comes from data[key] (a PNG path
  // or bytes) — Phase 3 supplies the owner's signature; not drawn when absent.
  w?: number;
  h?: number;
}

export interface ReceiptTemplateLike {
  basePdfPath: string;
  pageWidth: number;
  pageHeight: number;
  mediaBoxOffsetY: number;
  fieldMappingJson: Record<string, ReceiptFieldMapping>;
}

// Embedded fonts available to any template (referenced by name in the mapping).
const FONT_FILES: Record<string, string> = {
  'Montserrat-Black': 'Montserrat-Black.ttf',
  'Montserrat-Regular': 'Montserrat-Regular.ttf',
  Carlito: 'Carlito-Regular.ttf',
  'Carlito-Bold': 'Carlito-Bold.ttf',
};
const DEFAULT_FONT = 'Carlito';

@Injectable()
export class ReceiptPdfService {
  // assets/ lives at the backend root (not copied into dist); cwd is apps/backend.
  private readonly assetsRoot = path.resolve(process.cwd(), 'assets');

  async generate(
    template: ReceiptTemplateLike,
    data: Record<string, string | number | Uint8Array>,
    opts?: { watermark?: string },
  ): Promise<Buffer> {
    const baseBytes = fs.readFileSync(
      path.resolve(process.cwd(), template.basePdfPath),
    );
    const pdfDoc = await PDFDocument.load(baseBytes);
    pdfDoc.registerFontkit(fontkit);
    const page = pdfDoc.getPages()[0];

    const fontCache: Record<string, PDFFont> = {};
    const getFont = async (name?: string): Promise<PDFFont> => {
      const key = name && FONT_FILES[name] ? name : DEFAULT_FONT;
      if (!fontCache[key]) {
        const bytes = fs.readFileSync(
          path.join(this.assetsRoot, 'fonts', FONT_FILES[key]),
        );
        // Full embed (NOT subset) — subsetting drops glyphs in some renderers.
        fontCache[key] = await pdfDoc.embedFont(bytes);
      }
      return fontCache[key];
    };

    // pdf-lib's drawText already positions relative to the page's MediaBox
    // lower-left, so a non-zero MediaBox origin (this base PDF starts at y=7.92)
    // needs NO compensation. Adding mediaBoxOffsetY here double-counts it and
    // floats every field ~8pt above its line — verified against the approved
    // preview. mediaBoxOffsetY is kept on the template for reference only.
    const yOf = (m: ReceiptFieldMapping): number => {
      const gap = m.gap ?? 2.5;
      return m.baseline != null
        ? m.baseline
        : template.pageHeight - (m.lineTop ?? 0) + gap;
    };

    for (const [key, m] of Object.entries(template.fieldMappingJson)) {
      if (m.type === 'signature_image') {
        // Signature PNG drawn into the box (lineTop=top, w/h size). Source is
        // data[key] (a PNG file path or bytes). Not drawn when absent, so real
        // receipts stay blank until Phase 3 supplies the owner's signature.
        const src = data[key];
        if (src == null || src === '' || typeof src === 'number') continue;
        const bytes =
          typeof src === 'string'
            ? fs.readFileSync(path.resolve(process.cwd(), src))
            : src;
        const img = await pdfDoc.embedPng(bytes);
        const w = m.w ?? img.width;
        const h = m.h ?? img.height;
        page.drawImage(img, {
          x: m.x ?? 0,
          y: template.pageHeight - (m.lineTop ?? 0) - h,
          width: w,
          height: h,
        });
        continue;
      }

      if (m.type === 'checkbox_group') {
        const selected = data[key];
        const optionX = m.options?.[String(selected)];
        if (optionX == null) continue;
        const font = await getFont(m.font);
        page.drawText(m.mark ?? 'X', {
          x: optionX + 3.5,
          y: yOf(m),
          size: m.size ?? 12,
          font,
          color: this.hexToRgb(m.color),
        });
        continue;
      }

      const raw = data[key];
      if (raw == null || raw === '' || typeof raw === 'object') continue;
      const value =
        m.type === 'currency'
          ? this.formatCurrency(raw)
          : (m.labels?.[String(raw)] ?? String(raw));
      const font = await getFont(m.font);
      const size = m.size ?? 11.5;
      let x = m.x ?? 0;
      if (m.autoShiftRightLimit != null) {
        const width = font.widthOfTextAtSize(value, size);
        if (x + width > m.autoShiftRightLimit) {
          x = m.autoShiftRightLimit - width;
        }
      }
      page.drawText(value, {
        x,
        y: yOf(m),
        size,
        font,
        color: this.hexToRgb(m.color),
      });
    }

    // Optional watermark on a freshly-generated receipt (used as the R2-disabled
    // fallback; the primary void path overlays the EXISTING PDF — stampWatermark).
    if (opts?.watermark) {
      this.drawWatermark(page, await getFont('Montserrat-Black'), opts.watermark);
    }

    return Buffer.from(await pdfDoc.save());
  }

  /**
   * AcroForm render mode ('acroform'): fill the base PDF's NAMED form fields
   * (instead of stamping text at coordinates), force a consistent appearance
   * (Carlito + a chosen color, overriding whatever DA the PDF editor left — e.g. a
   * near-white default), then FLATTEN so the recipient can't edit the values.
   * Because positions come from the base PDF, there is NO coordinate calibration.
   * Used by invoices; leaves the overlay `generate()` path (receipts) untouched.
   *
   * fieldMappingJson (per data key): { field?, type?, size?, color?, multiline?, labels? }
   *   - field:     AcroForm field name (defaults to the data key itself)
   *   - type:      'currency' formats the value as $#,##0.00
   *   - labels:    enum value -> friendly label map
   *   - color:     hex (defaults to brand navy #12235c)
   *   - a `signature_image` entry with { x, lineTop, w, h } is overlaid by
   *     coordinates AFTER flatten (a PDF signature widget is not an image slot).
   * Missing/empty values are skipped, so unused (bounded) rows render blank.
   */
  async generateFromAcroForm(
    template: ReceiptTemplateLike,
    data: Record<string, string | number | Uint8Array>,
    opts?: { watermark?: string },
  ): Promise<Buffer> {
    const baseBytes = fs.readFileSync(
      path.resolve(process.cwd(), template.basePdfPath),
    );
    const pdfDoc = await PDFDocument.load(baseBytes);
    pdfDoc.registerFontkit(fontkit);
    const appearanceFont = await pdfDoc.embedFont(
      fs.readFileSync(
        path.join(this.assetsRoot, 'fonts', FONT_FILES[DEFAULT_FONT]),
      ),
    );
    const form = pdfDoc.getForm();

    const signatures: { m: ReceiptFieldMapping; src: string | Uint8Array }[] = [];
    for (const [key, m] of Object.entries(template.fieldMappingJson)) {
      if (m.type === 'signature_image') {
        const src = data[key];
        if (src != null && src !== '' && typeof src !== 'number') {
          signatures.push({ m, src });
        }
        continue;
      }
      const raw = data[key];
      if (raw == null || raw === '' || typeof raw === 'object') continue;
      const value =
        m.type === 'currency'
          ? this.formatCurrency(raw)
          : (m.labels?.[String(raw)] ?? String(raw));
      const fieldName = m.field ?? key;
      let field: PDFTextField;
      try {
        field = form.getTextField(fieldName);
      } catch {
        continue; // field absent on this base PDF — tolerate
      }
      const size = m.size ?? 9;
      if (m.multiline) field.enableMultiline();
      field.setText(value);
      field.setFontSize(size);
      // Force appearance: override the editor's DA. The /Helv name is only used to
      // parse size+color; glyphs come from updateFieldAppearances(appearanceFont).
      field.acroField.setDefaultAppearance(`/Helv ${size} Tf ${this.daColor(m.color)}`);
    }

    form.updateFieldAppearances(appearanceFont);
    form.flatten();

    const page = pdfDoc.getPages()[0];
    for (const { m, src } of signatures) {
      const bytes =
        typeof src === 'string'
          ? fs.readFileSync(path.resolve(process.cwd(), src))
          : src;
      const img = await pdfDoc.embedPng(bytes);
      const w = m.w ?? img.width;
      const h = m.h ?? img.height;
      page.drawImage(img, {
        x: m.x ?? 0,
        y: template.pageHeight - (m.lineTop ?? 0) - h,
        width: w,
        height: h,
      });
    }

    if (opts?.watermark) {
      this.drawWatermark(
        page,
        await pdfDoc.embedFont(
          fs.readFileSync(
            path.join(this.assetsRoot, 'fonts', FONT_FILES['Montserrat-Black']),
          ),
        ),
        opts.watermark,
      );
    }

    return Buffer.from(await pdfDoc.save());
  }

  /**
   * Overlay a watermark on an EXISTING PDF (the original stored in R2) — loads
   * the real PDF and stamps over it, so a voided receipt is the SAME document
   * with a VOID stamp, not a regeneration. Stamps every page.
   */
  async stampWatermark(pdfBuffer: Buffer, text = 'VOID'): Promise<Buffer> {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    pdfDoc.registerFontkit(fontkit);
    const font = await pdfDoc.embedFont(
      fs.readFileSync(
        path.join(this.assetsRoot, 'fonts', FONT_FILES['Montserrat-Black']),
      ),
    );
    for (const page of pdfDoc.getPages()) {
      this.drawWatermark(page, font, text);
    }
    return Buffer.from(await pdfDoc.save());
  }

  // Big, semi-transparent red diagonal stamp spanning ~the whole page diagonal,
  // centered — unmistakable on any receipt download.
  private drawWatermark(page: PDFPage, font: PDFFont, text: string): void {
    const { width, height } = page.getSize();
    const diag = Math.sqrt(width * width + height * height);
    const angle = Math.atan2(height, width); // along the page diagonal (radians)
    const probe = font.widthOfTextAtSize(text, 100);
    const size = ((diag * 0.82) / probe) * 100; // ~82% of the diagonal
    const textW = font.widthOfTextAtSize(text, size);
    // Anchor so the text's visual center sits at the page center.
    const x = width / 2 - (textW / 2) * Math.cos(angle) + size * 0.33 * Math.sin(angle);
    const y = height / 2 - (textW / 2) * Math.sin(angle) - size * 0.33 * Math.cos(angle);
    page.drawText(text, {
      x,
      y,
      size,
      font,
      color: rgb(0.86, 0.12, 0.12),
      rotate: degrees((angle * 180) / Math.PI),
      opacity: 0.28,
    });
  }

  private formatCurrency(value: string | number): string {
    const n = Number(value);
    if (Number.isNaN(n)) return String(value);
    return (
      '$' +
      n.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  private hexToRgb(hex?: string) {
    const h = (hex ?? '#000000').replace('#', '');
    return rgb(
      parseInt(h.slice(0, 2), 16) / 255,
      parseInt(h.slice(2, 4), 16) / 255,
      parseInt(h.slice(4, 6), 16) / 255,
    );
  }

  // A PDF default-appearance color operator ("r g b rg") from a hex string.
  // Defaults to brand navy so AcroForm text never inherits an unusable editor DA.
  private daColor(hex?: string): string {
    const h = (hex ?? '#12235c').replace('#', '');
    const c = (i: number) => (parseInt(h.slice(i, i + 2), 16) / 255).toFixed(4);
    return `${c(0)} ${c(2)} ${c(4)} rg`;
  }
}
