import { Injectable } from '@nestjs/common';
import { degrees, PDFDocument, PDFFont, PDFPage, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Generic, template-driven receipt PDF generator. Coordinates + the base PDF
 * live in the ReceiptTemplate (DB), NOT in code — adding a new client is a new
 * row, not a code change. Validated to render pixel-identical to the approved
 * World Pavers preview (mediaBoxOffsetY=7.92, full font embed).
 */

export type ReceiptFieldType = 'text' | 'currency' | 'checkbox_group';

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
    data: Record<string, string | number>,
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
      if (raw == null || raw === '') continue;
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
}
