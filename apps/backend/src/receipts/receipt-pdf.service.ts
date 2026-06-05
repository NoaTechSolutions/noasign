import { Injectable } from '@nestjs/common';
import { PDFDocument, PDFFont, rgb } from 'pdf-lib';
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

    const offsetY = template.mediaBoxOffsetY ?? 0;
    // pdf-lib draws in PDF user space (origin at 0,0), which does NOT account for
    // a non-zero MediaBox lower-left, so the offset is added back here.
    const yOf = (m: ReceiptFieldMapping): number => {
      const gap = m.gap ?? 2.5;
      const base =
        m.baseline != null
          ? m.baseline
          : template.pageHeight - (m.lineTop ?? 0) + gap;
      return base + offsetY;
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
        m.type === 'currency' ? this.formatCurrency(raw) : String(raw);
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

    return Buffer.from(await pdfDoc.save());
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
