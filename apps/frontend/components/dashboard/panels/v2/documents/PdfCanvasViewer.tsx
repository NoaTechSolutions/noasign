'use client';

import { useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

// Self-hosted worker (copied to /public) — bundler-agnostic, works with
// Turbopack and offline (no CDN). Keep public/pdf.worker.min.mjs in sync with
// the installed pdfjs-dist version on upgrade.
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

/**
 * Canvas PDF viewer (pdf.js via react-pdf). Replaces the <iframe>, which mobile
 * browsers (iOS Safari / Android Chrome) refuse to render inline — they show a
 * native "Open" placeholder instead. Renders every page to a canvas at the
 * container width and at devicePixelRatio (crisp on desktop/retina).
 *
 * Loaded via next/dynamic({ ssr: false }) so pdf.js never runs during SSR.
 */
export default function PdfCanvasViewer({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [numPages, setNumPages] = useState(0);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="doc-pdf-canvas" ref={containerRef}>
      <Document
        file={url}
        loading={<div className="doc-detail-modal__hint">Loading PDF…</div>}
        error={
          <div className="doc-detail-modal__hint">Could not render the PDF.</div>
        }
        onLoadSuccess={({ numPages: n }) => setNumPages(n)}
      >
        {Array.from({ length: numPages }, (_, i) => (
          <Page
            key={i}
            pageNumber={i + 1}
            // Subtract the container padding so the page never overflows.
            width={width ? width - 16 : undefined}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            className="doc-pdf-canvas__page"
          />
        ))}
      </Document>
    </div>
  );
}
