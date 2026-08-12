import type { ContentData, ContentNode } from "@signalwerk/minicms/content";
import type {
  ComponentType,
  HTMLAttributes,
  ReactNode,
  RefCallback
} from "react";

export type AuthoringProps = HTMLAttributes<HTMLElement> & {
  ref?: RefCallback<HTMLElement>;
  "data-minicms-node-id"?: string;
  "data-minicms-node-type"?: string;
  "data-minicms-selected"?: string;
  "data-minicms-hidden"?: string;
};

export type FocusHandler = (nodeId: string) => AuthoringProps;

export type PreviewRendererProps = {
  data: ContentData;
  focus: FocusHandler;
};

export type RendererProps = {
  data: ContentData;
  focus?: FocusHandler;
  basePath?: string;
};

export type RenderedSlots = Record<string, ReactNode[]>;

export type RendererComponentProps = {
  node: ContentNode;
  slots: RenderedSlots;
  data: ContentData;
  basePath: string;
  authoring: boolean;
  authoringProps: AuthoringProps;
};

export type RendererComponent = ComponentType<RendererComponentProps>;
export type RendererRegistry = Record<string, RendererComponent>;

export function propertyText(node: ContentNode, name: string): string {
  const value = node.properties[name];
  return typeof value === "string" ? value : String(value ?? "");
}
