import { filenameFromHref, safeHref } from "../../render/model";
import SlotGroups, { hasSlotContent } from "../../render/slots";
import type { RendererComponentProps } from "../../render/types";

type PdfReference = {
  src: string | null;
  title: string;
  missingReason: string;
};

function isMapping(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function normalizePdfReference(value: unknown): PdfReference {
  const reference = isMapping(value) ? value : {};
  const record = isMapping(reference.record) ? reference.record : null;
  const properties = record && isMapping(record.properties) ? record.properties : {};
  const src = safeHref(properties.file);
  const title =
    typeof properties.title === "string" && properties.title.trim()
      ? properties.title
      : src
        ? filenameFromHref(src)
        : "PDF";

  return {
    src,
    title,
    missingReason: record
      ? "Für diese PDF-Datei ist keine gültige URL verfügbar."
      : "Es wurde keine PDF-Datei ausgewählt."
  };
}

export default function PdfViewer({
  node,
  slots,
  authoring,
  authoringProps
}: RendererComponentProps) {
  const pdf = normalizePdfReference(node.properties.asset);
  if (!pdf.src && !authoring && !hasSlotContent(slots)) return null;

  return (
    <section
      className="pdf-viewer"
      data-renderer-type="pdf_viewer"
      data-pdf-viewer=""
      data-pdf-src={pdf.src ?? undefined}
      aria-label={pdf.title}
      aria-busy={pdf.src ? true : undefined}
      tabIndex={pdf.src ? 0 : undefined}
      {...authoringProps}
    >
      {pdf.src ? (
        <>
          <div className="pdf-viewer__stage" data-pdf-stage="" data-page-count="1">
            <div className="pdf-viewer__loading" data-pdf-loading="" role="status">
              <span className="pdf-viewer__spinner" aria-hidden="true" />
              <span className="visually-hidden">PDF wird geladen…</span>
            </div>
            <div className="pdf-viewer__page" data-pdf-page-frame="">
              <canvas data-pdf-canvas="" aria-label="Seite 1" />
              <div
                className="pdf-viewer__text-layer"
                data-pdf-text-layer=""
                aria-hidden="true"
              />
            </div>
            <div className="pdf-viewer__page" data-pdf-page-frame="" hidden>
              <canvas data-pdf-canvas="" />
              <div
                className="pdf-viewer__text-layer"
                data-pdf-text-layer=""
                aria-hidden="true"
              />
            </div>
          </div>
          <p className="pdf-viewer__message" data-pdf-message="" role="status" />
          <div className="pdf-viewer__controls" aria-label="PDF-Navigation">
            <button type="button" data-pdf-previous="" disabled>
              Zurück
            </button>
            <span data-pdf-status="" aria-live="polite">Seite 1</span>
            <button type="button" data-pdf-next="" disabled>
              Weiter
            </button>
          </div>
        </>
      ) : (
        <p className="pdf-viewer__missing" role="status">
          {pdf.missingReason}
        </p>
      )}
      <SlotGroups slots={slots} />
    </section>
  );
}
