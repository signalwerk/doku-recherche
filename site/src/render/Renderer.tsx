import type { ContentData, ContentNode } from "@signalwerk/minicms/content";
import type { ReactNode } from "react";
import Accordion from "../components/Accordion/Accordion";
import Box from "../components/Box/Box";
import Column from "../components/Column/Column";
import Grid from "../components/Grid/Grid";
import Image from "../components/Image/Image";
import MediaFile from "../components/MediaFile/MediaFile";
import MediaImage from "../components/MediaImage/MediaImage";
import Page from "../components/Page/Page";
import PdfViewer from "../components/PdfViewer/PdfViewer";
import Shortcut from "../components/Shortcut/Shortcut";
import Text from "../components/Text/Text";
import Title from "../components/Title/Title";
import Unknown from "../components/Unknown/Unknown";
import { hiddenBoundaryValue, shouldRenderNode } from "./model";
import type {
  AuthoringProps,
  FocusHandler,
  RenderedSlots,
  RendererProps,
  RendererRegistry
} from "./types";

export const rendererRegistry = Object.freeze({
  page: Page,
  shortcut: Shortcut,
  title: Title,
  text: Text,
  image: Image,
  media_image: MediaImage,
  media_file: MediaFile,
  pdf_viewer: PdfViewer,
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
              key={(child.id || child.type) + ":" + index}
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
  const authoringProps: AuthoringProps = focus
    ? {
        "data-minicms-hidden": hiddenBoundaryValue(node, authoring),
        ...focus(node.id)
      }
    : {};

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

export { Unknown };
export default Renderer;
