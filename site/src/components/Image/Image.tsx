import type { CSSProperties } from "react";
import {
  normalizeImageReference,
  resolveImagePresentation
} from "../../render/model";
import SlotGroups, { hasSlotContent } from "../../render/slots";
import type { RendererComponentProps } from "../../render/types";

export function ImageMarkup({
  image,
  authoring
}: {
  image: ReturnType<typeof resolveImagePresentation>;
  authoring: boolean;
}) {
  if (!image.displaySrc) {
    return authoring ? (
      <div className="media-figure__missing" role="status">
        <strong>Image unavailable</strong>
        <span>{image.missingReason}</span>
      </div>
    ) : null;
  }

  const hasCssCrop = Boolean(image.cropStyle);
  const imageStyle: CSSProperties = hasCssCrop
    ? image.cropStyle ?? {}
    : { objectPosition: image.objectPosition };
  return (
    <>
      <div
        className={
          "media-figure__frame" +
          (hasCssCrop ? " media-figure__frame--css-crop" : "")
        }
        style={image.frameStyle ?? undefined}
      >
        <img
          src={image.displaySrc}
          alt={image.alt}
          width={image.displayWidth ?? undefined}
          height={image.displayHeight ?? undefined}
          style={imageStyle}
          loading="lazy"
          decoding="async"
        />
      </div>
      {image.caption ? <figcaption>{image.caption}</figcaption> : null}
    </>
  );
}

export default function Image({
  node,
  slots,
  authoring,
  authoringProps
}: RendererComponentProps) {
  const image = resolveImagePresentation(
    normalizeImageReference(node.properties.asset, node.properties),
    node.properties.ratio
  );
  if (!image.displaySrc && !authoring && !hasSlotContent(slots)) return null;

  return (
    <figure
      className={"media-figure media-figure--" + image.ratio}
      data-renderer-type="image"
      {...authoringProps}
    >
      <ImageMarkup image={image} authoring={authoring} />
      <SlotGroups slots={slots} />
    </figure>
  );
}
