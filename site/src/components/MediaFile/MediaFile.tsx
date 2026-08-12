import { filenameFromHref, safeHref } from "../../render/model";
import SlotGroups, { hasSlotContent } from "../../render/slots";
import type { RendererComponentProps } from "../../render/types";
import { propertyText } from "../../render/types";

export default function MediaFile({
  node,
  slots,
  authoring,
  authoringProps
}: RendererComponentProps) {
  const href = safeHref(node.properties.file);
  const title = propertyText(node, "title") || (href ? filenameFromHref(href) : "File");
  const description = propertyText(node, "description");
  if (!href && !authoring && !hasSlotContent(slots)) return null;

  return (
    <article
      className="file-card"
      data-renderer-type="media_file"
      {...authoringProps}
    >
      <p className="eyebrow">File</p>
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
      {href ? (
        <a className="file-card__link" href={href} download rel="noopener noreferrer">
          <span>Download</span>
          <span aria-hidden="true">↓</span>
        </a>
      ) : authoring ? (
        <p className="content-missing" role="status">No resolved file URL is available.</p>
      ) : null}
      <SlotGroups slots={slots} />
    </article>
  );
}
