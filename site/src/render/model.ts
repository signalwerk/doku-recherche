import {
  prependImageServiceOperations,
  type ContentNode,
  type ImageOperation,
  type ResolvedMarkdown
} from "@signalwerk/minicms/content";
import type { CSSProperties } from "react";

export type TitleTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span";

export type ParsedTitleElement = {
  tag: TitleTag;
  className?: string;
};

export type PresentationRatio = "original" | "landscape" | "square" | "portrait";

export type ImageSize = {
  width: number;
  height: number;
};

export type ImageCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
};

export type ImagePoint = {
  x: number;
  y: number;
};

export type NormalizedImage = {
  ref: string;
  src: string | null;
  filename: string;
  alt: string;
  caption: string;
  width: number | null;
  height: number | null;
  crop: ImageCrop | null;
  focus: ImagePoint | null;
  missingReason: string | null;
};

export type ImagePresentation = NormalizedImage & {
  ratio: PresentationRatio;
  displaySrc: string | null;
  displayWidth: number | null;
  displayHeight: number | null;
  presentationCrop: ImageCrop | null;
  cropStyle: CSSProperties | null;
  frameStyle: CSSProperties | null;
  objectPosition: string;
  serviceCropApplied: boolean;
};

const TITLE_CLASS = /^[a-z][a-z0-9_-]{0,47}$/;
const RATIO_VALUES = new Set<PresentationRatio>([
  "original",
  "landscape",
  "square",
  "portrait"
]);
const MAX_IMAGE_DIMENSION = 100_000;
const MAX_CSS_PERCENT = 5_000;

function isMapping(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function nonEmptyOwnString(
  value: Record<string, unknown>,
  name: string
): string | null {
  if (!Object.hasOwn(value, name) || typeof value[name] !== "string") {
    return null;
  }
  return value[name].trim() ? value[name] : null;
}

function finiteNumber(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function positiveDimension(value: unknown): number | null {
  const number = finiteNumber(value);
  if (number === null || number <= 0) return null;
  return Math.min(number, MAX_IMAGE_DIMENSION);
}

function cleanNumber(value: number): number {
  if (Math.abs(value) < 1e-10) return 0;
  return Number(value.toFixed(10));
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function percentage(value: number): string {
  const bounded = clamp(value, -MAX_CSS_PERCENT, MAX_CSS_PERCENT);
  return `${Number(bounded.toFixed(5))}%`;
}

export function parseTitleElement(value: unknown): ParsedTitleElement {
  if (value === "none") return { tag: "span" };
  if (typeof value !== "string") return { tag: "h2" };
  if (/^h[1-6]$/.test(value)) return { tag: value as TitleTag };

  const [tag, ...classes] = value.split(".");
  if (
    tag !== "p" ||
    classes.length > 8 ||
    classes.some((className) => !TITLE_CLASS.test(className))
  ) {
    return { tag: "h2" };
  }

  return {
    tag: "p",
    ...(classes.length ? { className: classes.join(" ") } : {})
  };
}

export function resolvedMarkdown(value: unknown): ResolvedMarkdown {
  if (typeof value === "string") {
    return { markdown: value, references: {}, links: {} };
  }
  if (!isMapping(value) || typeof value.markdown !== "string") {
    return { markdown: "", references: {}, links: {} };
  }
  return {
    markdown: value.markdown,
    references: isMapping(value.references)
      ? (value.references as ResolvedMarkdown["references"])
      : {},
    links: isMapping(value.links)
      ? (value.links as ResolvedMarkdown["links"])
      : {}
  };
}

export function markdownSource(value: unknown): string {
  return resolvedMarkdown(value).markdown;
}

export function nodeIsHidden(node: Pick<ContentNode, "properties">): boolean {
  return node.properties.hidden === true;
}

export function shouldRenderNode(
  node: Pick<ContentNode, "properties">,
  authoring: boolean
): boolean {
  return authoring || !nodeIsHidden(node);
}

export function hiddenBoundaryValue(
  node: Pick<ContentNode, "properties">,
  authoring: boolean
): "true" | undefined {
  return authoring && nodeIsHidden(node) ? "true" : undefined;
}

export function accordionOpen(authoring: boolean): true | undefined {
  return authoring ? true : undefined;
}

export function safeBoxBackground(value: unknown): "paper" | "soft" | "accent" {
  return value === "paper" || value === "accent" ? value : "soft";
}

export function safeGridLayout(value: unknown): "default" | "full-width" {
  return value === "full_width" ? "full-width" : "default";
}

export function gridLine(value: unknown): number | null {
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 && number <= 12
    ? number
    : null;
}

export function safeHref(value: unknown): string | null {
  if (typeof value !== "string" || !value || value !== value.trim()) return null;
  if (/[/\\]\.{2}(?:[/\\]|$)/.test(value) || /[\u0000-\u001f\u007f]/.test(value)) {
    return null;
  }
  try {
    const url = new URL(value, "https://minicms.invalid/");
    return url.protocol === "http:" || url.protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}

export function filenameFromHref(value: string): string {
  try {
    const path = new URL(value, "https://minicms.invalid/").pathname;
    const filename = path.split("/").filter(Boolean).at(-1);
    return filename ? decodeURIComponent(filename) : "Download file";
  } catch {
    return "Download file";
  }
}

export function normalizeRotation(value: unknown): number {
  const number = finiteNumber(value);
  if (number === null) return 0;
  let normalized = cleanNumber(number % 360);
  if (normalized > 180) normalized -= 360;
  if (normalized <= -180) normalized += 360;
  return cleanNumber(normalized);
}

function imageSize(file: Record<string, unknown>): ImageSize | null {
  const width = positiveDimension(file.width);
  const height = positiveDimension(file.height);
  return width && height ? { width, height } : null;
}

export function boundedImageCrop(
  value: unknown,
  size: ImageSize | null
): ImageCrop | null {
  if (!isMapping(value)) return null;
  const x = finiteNumber(value.x);
  const y = finiteNumber(value.y);
  const rawWidth = positiveDimension(value.width);
  const rawHeight = positiveDimension(value.height);
  if (x === null || y === null || rawWidth === null || rawHeight === null) {
    return null;
  }

  const rotation = normalizeRotation(value.rotation);
  if (!size) {
    return { x, y, width: rawWidth, height: rawHeight, rotation };
  }

  let width = Math.min(rawWidth, size.width);
  let height = Math.min(rawHeight, size.height);
  const radians = (rotation * Math.PI) / 180;
  const cosine = Math.abs(Math.cos(radians));
  const sine = Math.abs(Math.sin(radians));
  let halfBoundsWidth = (cosine * width + sine * height) / 2;
  let halfBoundsHeight = (sine * width + cosine * height) / 2;
  const fitScale = Math.min(
    1,
    size.width / (halfBoundsWidth * 2),
    size.height / (halfBoundsHeight * 2)
  );

  if (fitScale < 1) {
    width = Math.max(1, width * fitScale);
    height = Math.max(1, height * fitScale);
    halfBoundsWidth = (cosine * width + sine * height) / 2;
    halfBoundsHeight = (sine * width + cosine * height) / 2;
  }

  const requestedCenterX = x + rawWidth / 2;
  const requestedCenterY = y + rawHeight / 2;
  const centerX = clamp(
    requestedCenterX,
    halfBoundsWidth,
    size.width - halfBoundsWidth
  );
  const centerY = clamp(
    requestedCenterY,
    halfBoundsHeight,
    size.height - halfBoundsHeight
  );

  return {
    x: cleanNumber(centerX - width / 2),
    y: cleanNumber(centerY - height / 2),
    width: cleanNumber(width),
    height: cleanNumber(height),
    rotation
  };
}

function normalizedPoint(value: unknown, size: ImageSize | null): ImagePoint | null {
  if (!isMapping(value)) return null;
  const x = finiteNumber(value.x);
  const y = finiteNumber(value.y);
  if (x === null || y === null) return null;
  return size
    ? {
        x: clamp(x, 0, size.width),
        y: clamp(y, 0, size.height)
      }
    : { x, y };
}

function selectionValue(
  selections: Record<string, unknown>,
  name: string
): unknown {
  const selection = selections[name];
  return isMapping(selection) ? selection.value : null;
}

function normalizeFile(
  fileValue: unknown,
  ref: string,
  alt: string,
  caption: string,
  selections: Record<string, unknown>
): NormalizedImage {
  if (!isMapping(fileValue)) {
    return {
      ref,
      src: null,
      filename: "",
      alt,
      caption,
      width: null,
      height: null,
      crop: null,
      focus: null,
      missingReason: ref
        ? `Image reference “${ref}” has no resolved image file.`
        : "No image has been selected."
    };
  }

  const src = safeHref(fileValue.src);
  const size = imageSize(fileValue);
  const filename = typeof fileValue.filename === "string" ? fileValue.filename : "";
  return {
    ref,
    src,
    filename,
    alt,
    caption,
    width: size?.width ?? null,
    height: size?.height ?? null,
    crop: boundedImageCrop(selectionValue(selections, "crop"), size),
    focus: normalizedPoint(selectionValue(selections, "focus"), size),
    missingReason: src
      ? null
      : `Image${filename ? ` “${filename}”` : ""} has no resolved source URL.`
  };
}

export function normalizeImageReference(
  value: unknown,
  overrides: Record<string, unknown> = {}
): NormalizedImage {
  const reference = isMapping(value) ? value : {};
  const refValue = reference.ref;
  const ref = ["string", "number", "boolean"].includes(typeof refValue)
    ? String(refValue)
    : "";
  const record = isMapping(reference.record) ? reference.record : null;
  const properties = record && isMapping(record.properties) ? record.properties : {};
  const selections = isMapping(reference.selections) ? reference.selections : {};
  const libraryAlt = typeof properties.alt === "string" ? properties.alt : "";
  const libraryCaption = typeof properties.caption === "string" ? properties.caption : "";
  const overrideAlt = nonEmptyOwnString(overrides, "alt");
  const overrideCaption = nonEmptyOwnString(overrides, "caption");

  if (!record) {
    return {
      ref,
      src: null,
      filename: "",
      alt: overrideAlt ?? "",
      caption: overrideCaption ?? "",
      width: null,
      height: null,
      crop: null,
      focus: null,
      missingReason: ref
        ? `Image reference “${ref}” could not be resolved.`
        : "No image has been selected."
    };
  }

  return normalizeFile(
    properties.file,
    ref,
    overrideAlt ?? libraryAlt,
    overrideCaption ?? libraryCaption,
    selections
  );
}

export function normalizeMediaImage(
  propertiesValue: unknown
): NormalizedImage {
  const properties = isMapping(propertiesValue) ? propertiesValue : {};
  return normalizeFile(
    properties.file,
    "",
    typeof properties.alt === "string" ? properties.alt : "",
    typeof properties.caption === "string" ? properties.caption : "",
    {}
  );
}

export function normalizePresentationRatio(value: unknown): PresentationRatio {
  return typeof value === "string" && RATIO_VALUES.has(value as PresentationRatio)
    ? (value as PresentationRatio)
    : "original";
}

function ratioNumber(ratio: PresentationRatio): number | null {
  if (ratio === "landscape") return 16 / 9;
  if (ratio === "square") return 1;
  if (ratio === "portrait") return 3 / 4;
  return null;
}

function pointInCropCoordinates(point: ImagePoint, crop: ImageCrop): ImagePoint {
  const centerX = crop.x + crop.width / 2;
  const centerY = crop.y + crop.height / 2;
  const radians = (crop.rotation * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const deltaX = point.x - centerX;
  const deltaY = point.y - centerY;
  return {
    x: cosine * deltaX + sine * deltaY + crop.width / 2,
    y: -sine * deltaX + cosine * deltaY + crop.height / 2
  };
}

function pointFromCropCoordinates(point: ImagePoint, crop: ImageCrop): ImagePoint {
  const centerX = crop.x + crop.width / 2;
  const centerY = crop.y + crop.height / 2;
  const radians = (crop.rotation * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const deltaX = point.x - crop.width / 2;
  const deltaY = point.y - crop.height / 2;
  return {
    x: centerX + cosine * deltaX - sine * deltaY,
    y: centerY + sine * deltaX + cosine * deltaY
  };
}

export function presentationCrop(
  size: ImageSize | null,
  selectedCrop: ImageCrop | null,
  focus: ImagePoint | null,
  ratio: PresentationRatio
): ImageCrop | null {
  const targetRatio = ratioNumber(ratio);
  if (!targetRatio) return selectedCrop;

  const base = selectedCrop ?? (size
    ? { x: 0, y: 0, width: size.width, height: size.height, rotation: 0 }
    : null);
  if (!base) return null;

  const localFocus = focus
    ? pointInCropCoordinates(focus, base)
    : { x: base.width / 2, y: base.height / 2 };
  let width = base.width;
  let height = base.height;
  if (base.width / base.height > targetRatio) {
    width = height * targetRatio;
  } else {
    height = width / targetRatio;
  }

  const localCenter = {
    x: clamp(localFocus.x, width / 2, base.width - width / 2),
    y: clamp(localFocus.y, height / 2, base.height - height / 2)
  };
  const center = pointFromCropCoordinates(localCenter, base);
  return {
    x: cleanNumber(center.x - width / 2),
    y: cleanNumber(center.y - height / 2),
    width: cleanNumber(width),
    height: cleanNumber(height),
    rotation: base.rotation
  };
}

export function cssCropStyle(
  size: ImageSize | null,
  crop: ImageCrop | null
): CSSProperties | null {
  if (!size || !crop) return null;
  const centerX = crop.x + crop.width / 2;
  const centerY = crop.y + crop.height / 2;
  const sourceWidth = (size.width / crop.width) * 100;
  const sourceLeft = 50 - (centerX / crop.width) * 100;
  const sourceTop = 50 - (centerY / crop.height) * 100;
  const originX = (centerX / size.width) * 100;
  const originY = (centerY / size.height) * 100;

  return {
    width: percentage(Math.max(100, sourceWidth)),
    maxWidth: "none",
    left: percentage(sourceLeft),
    top: percentage(sourceTop),
    transformOrigin: `${percentage(originX)} ${percentage(originY)}`,
    transform: crop.rotation ? `rotate(${cleanNumber(-crop.rotation)}deg)` : undefined
  };
}

function imageCropOperation(crop: ImageCrop): ImageOperation {
  return {
    type: "crop",
    options: {
      left: crop.x,
      top: crop.y,
      width: crop.width,
      height: crop.height,
      ...(crop.rotation ? { rotation: crop.rotation } : {})
    }
  };
}

export function resolveImagePresentation(
  image: NormalizedImage,
  ratioValue: unknown = "original"
): ImagePresentation {
  const ratio = normalizePresentationRatio(ratioValue);
  const size = image.width && image.height
    ? { width: image.width, height: image.height }
    : null;
  const crop = presentationCrop(size, image.crop, image.focus, ratio);
  let displaySrc = image.src;
  let serviceCropApplied = false;

  if (displaySrc && crop) {
    try {
      const processed = prependImageServiceOperations(displaySrc, [
        imageCropOperation(crop)
      ]);
      if (processed) {
        displaySrc = processed;
        serviceCropApplied = true;
      }
    } catch {
      // Invalid or unsupported service URLs deliberately use the bounded CSS fallback.
    }
  }

  const objectPosition = size && image.focus
    ? `${percentage((image.focus.x / size.width) * 100)} ${percentage((image.focus.y / size.height) * 100)}`
    : "50% 50%";
  const frameRatio = crop
    ? crop.width / crop.height
    : ratioNumber(ratio) ?? (size ? size.width / size.height : null);

  return {
    ...image,
    ratio,
    displaySrc,
    displayWidth: crop ? Math.max(1, Math.round(crop.width)) : image.width,
    displayHeight: crop ? Math.max(1, Math.round(crop.height)) : image.height,
    presentationCrop: crop,
    cropStyle: serviceCropApplied ? null : cssCropStyle(size, crop),
    frameStyle: frameRatio ? { aspectRatio: String(frameRatio) } : null,
    objectPosition,
    serviceCropApplied
  };
}
