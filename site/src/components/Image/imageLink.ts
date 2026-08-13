import {
  parseInlineLinkUrl,
  type ContentRecord,
  type ResolvedMarkdownLink,
  type ResolvedUrl
} from "@signalwerk/minicms/content";
import { resolvedPageLinkHref } from "../../model/routes.ts";

function isMapping(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function contentRecord(value: unknown): ContentRecord | null {
  if (!isMapping(value)) return null;
  return typeof value.id === "string" &&
    typeof value.type === "string" &&
    isMapping(value.properties) &&
    isMapping(value.slots)
    ? (value as ContentRecord)
    : null;
}

function resolvedContentLink(value: unknown): ResolvedMarkdownLink | null {
  if (
    !isMapping(value) ||
    typeof value.collection !== "string" ||
    typeof value.ref !== "string" ||
    !Array.isArray(value.ancestors)
  ) {
    return null;
  }
  const record = value.record === null ? null : contentRecord(value.record);
  const ancestors = value.ancestors.map(contentRecord);
  if ((value.record !== null && !record) || ancestors.some((item) => !item)) {
    return null;
  }
  return {
    collection: value.collection,
    ref: value.ref,
    record,
    ancestors: ancestors as ContentRecord[]
  };
}

export function resolvedUrlValue(value: unknown): ResolvedUrl {
  if (typeof value === "string") return { url: value, link: null };
  if (!isMapping(value) || typeof value.url !== "string") {
    return { url: "", link: null };
  }
  return {
    url: value.url,
    link: resolvedContentLink(value.link)
  };
}

function externalHttpHref(value: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}

/** Resolve an image link without exposing miniCMS's persisted custom scheme. */
export function imageLinkHref(value: unknown, basePath: string): string | null {
  const resolved = resolvedUrlValue(value);
  const parsed = parseInlineLinkUrl(resolved.url);
  if (parsed) {
    const link = resolved.link;
    if (
      !link ||
      link.collection !== parsed.collection ||
      link.ref !== parsed.ref
    ) {
      return null;
    }
    return resolvedPageLinkHref(link, basePath);
  }
  if (resolved.link) return null;
  return externalHttpHref(resolved.url);
}
