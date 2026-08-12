import { ImageMarkup } from "../Image/Image";
import {
  normalizeMediaImage,
  resolveImagePresentation
} from "../../render/model";
import SlotGroups, { hasSlotContent } from "../../render/slots";
import type { RendererComponentProps } from "../../render/types";
import { propertyText } from "../../render/types";

export default function MediaImage({
  node,
  slots,
  authoring,
  authoringProps
}: RendererComponentProps) {
  const image = resolveImagePresentation(normalizeMediaImage(node.properties));
  if (!image.displaySrc && !authoring && !hasSlotContent(slots)) return null;

  return (
    <figure
      className="media-figure media-figure--library"
      data-renderer-type="media_image"
      {...authoringProps}
    >
      {propertyText(node, "title") ? (
        <p className="eyebrow">{propertyText(node, "title")}</p>
      ) : null}
      <ImageMarkup image={image} authoring={authoring} />
      <SlotGroups slots={slots} />
    </figure>
  );
}
