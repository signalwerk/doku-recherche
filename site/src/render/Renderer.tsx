import type { ContentData, ContentNode } from "@signalwerk/minicms/content";
import type { CSSProperties, ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import {
  accordionOpen,
  filenameFromHref,
  gridLine,
  hiddenBoundaryValue,
  markdownSource,
  normalizeImageReference,
  normalizeMediaImage,
  parseTitleElement,
  resolveImagePresentation,
  safeBoxBackground,
  safeGridLayout,
  safeHref,
  shouldRenderNode
} from "./model";
import type {
  AuthoringProps,
  FocusHandler,
  RenderedSlots,
  RendererComponentProps,
  RendererProps,
  RendererRegistry
} from "./types";

function propertyText(node: ContentNode, name: string): string {
  const value = node.properties[name];
  return typeof value === "string" ? value : String(value ?? "");
}

function slotEntries(
  slots: RenderedSlots,
  omitted: readonly string[] = []
): Array<[string, ReactNode[]]> {
  const omittedNames = new Set(omitted);
  return Object.entries(slots).filter(([name]) => !omittedNames.has(name));
}

function hasSlotContent(slots: RenderedSlots): boolean {
  return Object.values(slots).some((children) => children.length > 0);
}

function SlotGroups({
  slots,
  omitted = []
}: {
  slots: RenderedSlots;
  omitted?: readonly string[];
}) {
  return slotEntries(slots, omitted).map(([name, children]) => (
    <div className="content-slot" data-slot={name} key={name}>
      {children}
    </div>
  ));
}

function hiddenValue(node: ContentNode, authoring: boolean) {
  return hiddenBoundaryValue(node, authoring);
}

function Page({
  node,
  slots,
  data,
  authoring,
  authoringProps
}: RendererComponentProps) {
  const siteName = typeof data.config.site?.name === "string"
    ? data.config.site.name
    : "Archive";
  const title = propertyText(node, "title") || "Untitled page";
  const layout = node.properties.layout === "wide" ? "wide" : "default";

  return (
    <article
      className={`page page--${layout}`}
      data-renderer-type="page"
      data-minicms-hidden={hiddenValue(node, authoring)}
      {...authoringProps}
    >
      <header className="site-header">
        <p className="site-header__mark" aria-label={siteName}>
          <span aria-hidden="true">D</span>
        </p>
        <div className="site-header__rule" aria-hidden="true" />
        <p className="site-header__descriptor">Dokumente · Kontexte · Spuren</p>
      </header>
      <h1 className="visually-hidden">{title}</h1>
      <div className="page__content" data-slot="content">
        {slots.content}
      </div>
      <SlotGroups slots={slots} omitted={["content"]} />
      <footer className="site-footer">
        <span>Archiv · Zürich</span>
      </footer>
    </article>
  );
}

function Shortcut({
  node,
  slots,
  authoring,
  authoringProps
}: RendererComponentProps) {
  const mode = node.properties.mode === "selected_target"
    ? "Selected page"
    : "First visible child";
  const targetValue = node.properties.target;
  const target = targetValue && typeof targetValue === "object" && !Array.isArray(targetValue)
    ? targetValue as Record<string, unknown>
    : null;
  const targetRecord = target?.record && typeof target.record === "object"
    ? target.record as ContentNode
    : null;
  const targetTitle = targetRecord
    ? propertyText(targetRecord, "title") || targetRecord.id
    : target?.ref !== undefined
      ? String(target.ref)
      : "Not selected";

  return (
    <article
      className="shortcut"
      data-renderer-type="shortcut"
      data-minicms-hidden={hiddenValue(node, authoring)}
      {...authoringProps}
    >
      <p className="eyebrow">Redirect</p>
      <h1>{propertyText(node, "title") || "Untitled shortcut"}</h1>
      <dl>
        <div><dt>Mode</dt><dd>{mode}</dd></div>
        <div><dt>Destination</dt><dd>{targetTitle}</dd></div>
      </dl>
      <SlotGroups slots={slots} />
    </article>
  );
}

function Title({
  node,
  slots,
  authoring,
  authoringProps
}: RendererComponentProps) {
  const { tag: Element, className } = parseTitleElement(node.properties.element);
  return (
    <Element
      className={className}
      data-renderer-type="title"
      data-minicms-hidden={hiddenValue(node, authoring)}
      {...authoringProps}
    >
      {propertyText(node, "title")}
      <SlotGroups slots={slots} />
    </Element>
  );
}

function Text({
  node,
  slots,
  authoring,
  authoringProps
}: RendererComponentProps) {
  return (
    <div
      className="prose"
      data-renderer-type="text"
      data-minicms-hidden={hiddenValue(node, authoring)}
      {...authoringProps}
    >
      <ReactMarkdown skipHtml>{markdownSource(node.properties.text)}</ReactMarkdown>
      <SlotGroups slots={slots} />
    </div>
  );
}

function ImageMarkup({
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
        className={`media-figure__frame${hasCssCrop ? " media-figure__frame--css-crop" : ""}`}
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

function Image({
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
      className={`media-figure media-figure--${image.ratio}`}
      data-renderer-type="image"
      data-minicms-hidden={hiddenValue(node, authoring)}
      {...authoringProps}
    >
      <ImageMarkup image={image} authoring={authoring} />
      <SlotGroups slots={slots} />
    </figure>
  );
}

function MediaImage({
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
      data-minicms-hidden={hiddenValue(node, authoring)}
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

function MediaFile({
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
      data-minicms-hidden={hiddenValue(node, authoring)}
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

function Box({
  node,
  slots,
  authoring,
  authoringProps
}: RendererComponentProps) {
  const background = safeBoxBackground(node.properties.background);
  return (
    <section
      className={`content-box content-box--${background}`}
      data-renderer-type="box"
      data-minicms-hidden={hiddenValue(node, authoring)}
      {...authoringProps}
    >
      <div className="content-slot" data-slot="content">{slots.content}</div>
      <SlotGroups slots={slots} omitted={["content"]} />
    </section>
  );
}

function Accordion({
  node,
  slots,
  authoring,
  authoringProps
}: RendererComponentProps) {
  return (
    <details
      className="accordion"
      data-renderer-type="accordion"
      open={accordionOpen(authoring)}
      data-minicms-hidden={hiddenValue(node, authoring)}
      {...authoringProps}
    >
      <summary><span className="accordion__summary">{slots.summary}</span></summary>
      <div className="accordion__details" data-slot="details">{slots.details}</div>
      <SlotGroups slots={slots} omitted={["summary", "details"]} />
    </details>
  );
}

function Grid({
  node,
  slots,
  authoring,
  authoringProps
}: RendererComponentProps) {
  const layout = safeGridLayout(node.properties.layout);
  return (
    <section
      className={`content-grid content-grid--${layout}`}
      data-renderer-type="grid"
      data-minicms-hidden={hiddenValue(node, authoring)}
      {...authoringProps}
    >
      {slots.columns}
      <SlotGroups slots={slots} omitted={["columns"]} />
    </section>
  );
}

type ColumnStyle = CSSProperties & {
  "--column-span"?: number;
  "--column-start"?: number;
};

function Column({
  node,
  slots,
  authoring,
  authoringProps
}: RendererComponentProps) {
  const width = gridLine(node.properties.width) ?? 12;
  const requestedStart = gridLine(node.properties.start);
  const start = requestedStart && requestedStart + width <= 13
    ? requestedStart
    : null;
  const style: ColumnStyle = {
    "--column-span": width,
    ...(start ? { "--column-start": start } : {})
  };
  return (
    <div
      className="content-column"
      data-renderer-type="column"
      style={style}
      data-minicms-hidden={hiddenValue(node, authoring)}
      {...authoringProps}
    >
      <div className="content-slot" data-slot="content">{slots.content}</div>
      <SlotGroups slots={slots} omitted={["content"]} />
    </div>
  );
}

function printableProperties(properties: Record<string, unknown>): string {
  try {
    return JSON.stringify(properties, null, 2);
  } catch {
    return "[Properties could not be displayed]";
  }
}

export function Unknown({
  node,
  slots,
  authoring,
  authoringProps
}: RendererComponentProps) {
  return (
    <section
      className="unknown-content"
      data-renderer-type="unknown"
      data-unsupported-type={node.type}
      data-minicms-hidden={hiddenValue(node, authoring)}
      {...authoringProps}
    >
      <strong>Unsupported content type: {node.type || "(missing type)"}</strong>
      {authoring ? <pre>{printableProperties(node.properties)}</pre> : null}
      <SlotGroups slots={slots} />
    </section>
  );
}

export const rendererRegistry = Object.freeze({
  page: Page,
  shortcut: Shortcut,
  title: Title,
  text: Text,
  image: Image,
  media_image: MediaImage,
  media_file: MediaFile,
  box: Box,
  accordion: Accordion,
  grid: Grid,
  column: Column
}) satisfies RendererRegistry;

function renderedSlots(
  node: ContentNode,
  data: ContentData,
  focus: FocusHandler | undefined
): RenderedSlots {
  return Object.fromEntries(
    Object.entries(node.slots ?? {}).map(([name, children]) => [
      name,
      Array.isArray(children)
        ? children.map((child, index) => (
            <RenderNode
              node={child}
              data={data}
              focus={focus}
              key={`${child.id || child.type}:${index}`}
            />
          ))
        : []
    ])
  );
}

function RenderNode({
  node,
  data,
  focus
}: {
  node: ContentNode;
  data: ContentData;
  focus?: FocusHandler;
}) {
  const authoring = Boolean(focus);
  if (!shouldRenderNode(node, authoring)) return null;

  const Component = rendererRegistry[node.type as keyof typeof rendererRegistry] ?? Unknown;
  const authoringProps: AuthoringProps = focus ? focus(node.id) : {};
  return (
    <Component
      node={node}
      slots={renderedSlots(node, data, focus)}
      data={data}
      authoring={authoring}
      authoringProps={authoringProps}
    />
  );
}

export function renderNode(
  node: ContentNode,
  data: ContentData,
  focus?: FocusHandler
): ReactNode {
  return <RenderNode node={node} data={data} focus={focus} />;
}

export function Renderer({ data, focus }: RendererProps) {
  return <RenderNode node={data.item} data={data} focus={focus} />;
}

export default Renderer;
