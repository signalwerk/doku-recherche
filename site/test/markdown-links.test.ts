import assert from "node:assert/strict";
import test from "node:test";

import {
  buildInlineLinkUrl,
  type ContentRecord,
  type ResolvedMarkdown
} from "@signalwerk/minicms/content";

import {
  markdownLinkPresentation,
  markdownUrlTransform
} from "../src/components/Text/markdownLink.ts";

function page(
  contentId: string,
  parentId: string | null,
  slug: string
): ContentRecord {
  return {
    id: contentId,
    type: "page",
    order: 0,
    properties: {
      content_id: contentId,
      parent_id: parentId,
      slug,
      hidden: false
    },
    slots: {}
  };
}

test("preserves only canonical content links for anchor presentation", () => {
  const href = buildInlineLinkUrl("pages", "target");
  assert.equal(markdownUrlTransform(href, "href"), href);
  assert.equal(markdownUrlTransform(href, "src"), "");
  assert.equal(markdownUrlTransform("javascript:alert(1)", "href"), "");
  assert.equal(
    markdownUrlTransform("https://example.com/page", "href"),
    "https://example.com/page"
  );
});

test("maps an exact resolved content link to its current public href", () => {
  const href = buildInlineLinkUrl("pages", "target");
  const home = page("home", null, "");
  const target = page("target", "home", "target");
  const links: ResolvedMarkdown["links"] = {
    [href]: {
      collection: "pages",
      ref: "target",
      record: target,
      ancestors: [home]
    }
  };

  assert.deepEqual(
    markdownLinkPresentation(href, links, "/repository/"),
    {
      collection: "pages",
      ref: "target",
      href: "/repository/target"
    }
  );
  const mismatchedLinks: ResolvedMarkdown["links"] = {
    [href]: {
      collection: "pages",
      ref: "another",
      record: target,
      ancestors: [home]
    }
  };
  assert.equal(
    markdownLinkPresentation(href, mismatchedLinks, "/")?.href,
    null
  );
});

test("keeps missing custom targets non-navigable without affecting web links", () => {
  const href = buildInlineLinkUrl("pages", "missing");
  assert.deepEqual(markdownLinkPresentation(href, {}, "/"), {
    collection: "pages",
    ref: "missing",
    href: null
  });
  assert.equal(
    markdownLinkPresentation("https://example.com/page", {}, "/"),
    null
  );
});
