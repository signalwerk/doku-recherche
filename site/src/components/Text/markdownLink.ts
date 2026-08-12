import {
  parseInlineLinkUrl,
  type ResolvedMarkdown
} from "@signalwerk/minicms/content";
import { defaultUrlTransform } from "react-markdown";
import { resolvedPageLinkHref } from "../../model/routes.ts";

export interface MarkdownLinkPresentation {
  collection: string;
  ref: string;
  href: string | null;
}

export function markdownUrlTransform(url: string, key: string): string {
  return key === "href" && parseInlineLinkUrl(url)
    ? url
    : defaultUrlTransform(url);
}

export function markdownLinkPresentation(
  href: string | undefined,
  links: ResolvedMarkdown["links"],
  basePath: string
): MarkdownLinkPresentation | null {
  if (!href) return null;
  const parsed = parseInlineLinkUrl(href);
  if (!parsed) return null;
  const resolved = links[href];
  const valid =
    resolved?.collection === parsed.collection && resolved.ref === parsed.ref;
  return {
    collection: parsed.collection,
    ref: parsed.ref,
    href: valid && resolved ? resolvedPageLinkHref(resolved, basePath) : null
  };
}
