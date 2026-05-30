"use client";

import type { RefObject } from "react";

type Props = {
  /** Ref to the DOM element to capture. Can wrap an SVG, a div, or anything
   *  printable. We clone it and inject it into a new window for printing. */
  targetRef: RefObject<HTMLElement | SVGSVGElement | null>;
  /** Title rendered above the captured content in the printed page. */
  title: string;
  /** Optional subtitle (e.g. lineage chain "X بن Y بن Z…"). */
  subtitle?: string;
  locale: "ar" | "en";
  /** Override the button label. Defaults to locale-aware "Export PDF". */
  label?: string;
};

/**
 * Dependency-free PDF export — opens a new window with a clone of the target
 * element, re-attaches the host page's stylesheets so Tailwind classes survive,
 * adds the (lineage-aware) title + subtitle, then triggers window.print(). The
 * user picks "Save as PDF" from the print dialog.
 *
 * Works with any view: clone an SVG element for the focus / descendants
 * canvases, or a wrapping div for the tree / layered views (the family
 * windows / generation rows are plain HTML).
 */
export default function ExportPdfButton({ targetRef, title, subtitle, locale, label }: Props) {
  const ar = locale === "ar";
  const buttonLabel = label ?? (ar ? "تصدير PDF" : "Export PDF");

  function exportToPdf() {
    const el = targetRef.current;
    if (!el) return;
    const printWin = window.open("", "_blank");
    if (!printWin) {
      window.alert(ar ? "متصفحك يمنع النوافذ المنبثقة." : "Your browser blocked the popup.");
      return;
    }

    // -------- Compute a custom page size that matches the content's natural
    //          aspect ratio, so the print engine never breaks it across
    //          multiple pages. Anchor on a generous width (420mm = A3 width
    //          landscape) and derive height from the aspect ratio. Clamp to
    //          [150mm, 2000mm] so pathologic-aspect content doesn't produce
    //          a printer-rejecting paper size.
    let aspectRatio: number | null = null;
    if (el instanceof SVGSVGElement) {
      const vb = el.getAttribute("viewBox");
      if (vb) {
        const parts = vb.trim().split(/\s+/).map((s) => parseFloat(s));
        if (parts.length >= 4 && parts[2] > 0 && parts[3] > 0) {
          aspectRatio = parts[2] / parts[3];
        }
      }
      if (aspectRatio == null) {
        const w = el.getBoundingClientRect().width;
        const h = el.getBoundingClientRect().height;
        if (w > 0 && h > 0) aspectRatio = w / h;
      }
    } else if (el instanceof HTMLElement) {
      // Use scrollWidth/scrollHeight to capture the FULL natural size, not
      // the visible clipped portion (the tree view often has overflow-y:auto).
      const w = el.scrollWidth;
      const h = el.scrollHeight;
      if (w > 0 && h > 0) aspectRatio = w / h;
    }

    const pageWidthMM = 420;
    // Extra vertical room for the title block (title + subtitle + date ≈ 60mm)
    // so the diagram itself gets the full aspect-ratio'd area below it.
    const titleBlockMM = 30;
    let pageHeightMM: number;
    if (aspectRatio != null && aspectRatio > 0) {
      pageHeightMM = pageWidthMM / aspectRatio + titleBlockMM;
    } else {
      pageHeightMM = 297; // A3 landscape default
    }
    pageHeightMM = Math.max(150, Math.min(2000, pageHeightMM));

    // Clone a fresh copy so we don't disturb the live one. For SVGs we strip
    // width/height + set preserveAspectRatio so it scales to the page.
    const cloneNode = el.cloneNode(true) as HTMLElement | SVGSVGElement;
    if (cloneNode instanceof SVGSVGElement) {
      cloneNode.removeAttribute("width");
      cloneNode.removeAttribute("height");
      cloneNode.setAttribute("preserveAspectRatio", "xMidYMid meet");
      cloneNode.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    }

    // Copy <link rel=stylesheet> and inline <style> tags so Tailwind survives
    // in the new window. Without this every class becomes a no-op.
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((node) => node.outerHTML)
      .join("\n");

    const safeTitle = escapeHtml(title);
    const safeSubtitle = subtitle ? escapeHtml(subtitle) : "";
    const dateText = new Date().toLocaleDateString(ar ? "ar" : "en");

    const html = `<!DOCTYPE html>
<html lang="${ar ? "ar" : "en"}" dir="${ar ? "rtl" : "ltr"}">
<head>
<meta charset="UTF-8" />
<title>${safeTitle}</title>
${styles}
<style>
  html, body { margin: 0; padding: 0; background: #fff; font-family: inherit; }
  body { padding: 14mm; }
  .pdf-title    { text-align: center; font-size: 22px; font-weight: 600; color: #3b2a10; margin-bottom: 4px; line-height: 1.3; }
  .pdf-subtitle { text-align: center; font-size: 13px; color: #6b7280; margin-bottom: 4px; line-height: 1.4; }
  .pdf-date     { text-align: center; font-size: 11px; color: #9ca3af; margin-bottom: 12px; }
  /* Keep everything on one page: no breaks anywhere inside the printable area. */
  .pdf-content,
  .pdf-content * {
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .pdf-content { width: 100%; overflow: visible; }
  /* SVG fits the page width; height auto so aspect ratio is preserved. With
     the page sized to match the content's aspect ratio, this fills perfectly
     without overflowing. */
  .pdf-content svg { display: block; margin: 0 auto; width: 100%; height: auto; max-width: 100%; }
  /* HTML containers (Tree / Layers views): drop overflow clips so the FULL
     natural size renders. */
  .pdf-content .max-h-\\[70vh\\], .pdf-content .max-h-\\[78vh\\], .pdf-content [class*="max-h-"] {
    max-height: none !important;
    overflow: visible !important;
  }
  .pdf-content .overflow-x-auto, .pdf-content .overflow-y-auto, .pdf-content .overflow-auto {
    overflow: visible !important;
  }
  @media print {
    body { padding: 8mm; }
    @page { size: ${pageWidthMM.toFixed(1)}mm ${pageHeightMM.toFixed(1)}mm; margin: 0; }
  }
</style>
</head>
<body>
<div class="pdf-title">${safeTitle}</div>
${safeSubtitle ? `<div class="pdf-subtitle">${safeSubtitle}</div>` : ""}
<div class="pdf-date">${dateText}</div>
<div class="pdf-content">__CONTENT__</div>
<script>
  window.addEventListener("load", () => {
    setTimeout(() => { window.focus(); window.print(); }, 400);
  });
  window.addEventListener("afterprint", () => { window.close(); });
</script>
</body>
</html>`;

    // We can't string-interpolate cloned HTML safely (it may contain
    // unescaped < / > that interfere with parsing). Use the OuterHTML
    // approach by writing the placeholder, then injecting the clone.
    printWin.document.open();
    printWin.document.write(html.replace("__CONTENT__", cloneNode.outerHTML));
    printWin.document.close();
  }

  return (
    <button
      type="button"
      onClick={exportToPdf}
      className="inline-flex items-center gap-1.5 rounded-full border border-sand-300 bg-white px-3 py-1 text-xs font-medium text-sand-700 shadow-soft hover:bg-sand-50"
      aria-label={buttonLabel}
      title={ar ? "تصدير إلى PDF" : "Export to PDF"}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      {buttonLabel}
    </button>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
