import type { CSSProperties } from "react";
import {
  normalizeImageReference,
  resolveImagePresentation
} from "../../render/model";
import SlotGroups, { hasSlotContent } from "../../render/slots";
import type { RendererComponentProps } from "../../render/types";
import { imageLinkHref } from "./imageLink";

export function ImageMarkup({
  image,
  authoring,
  href
}: {
  image: ReturnType<typeof resolveImagePresentation>;
  authoring: boolean;
  href: string | null;
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
  const frame = (
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
  );
  return (
    <>
      {href ? (
        <a className="media-figure__link" href={href}>
          {frame}
        </a>
      ) : (
        frame
      )}
      {image.caption ? <figcaption>{image.caption}</figcaption> : null}
    </>
  );
}

export default function Image({
  node,
  slots,
  authoring,
  authoringProps,
  basePath
}: RendererComponentProps) {
  const image = resolveImagePresentation(
    normalizeImageReference(node.properties.asset, node.properties),
    node.properties.ratio
  );
  const href = imageLinkHref(node.properties.link, basePath);
  if (!image.displaySrc && !authoring && !hasSlotContent(slots)) return null;

  return (
    <figure
      className={"media-figure media-figure--" + image.ratio}
      data-renderer-type="image"
      {...authoringProps}
    >
      <ImageMarkup image={image} authoring={authoring} href={href} />
      <SlotGroups slots={slots} />
    </figure>
  );
}
