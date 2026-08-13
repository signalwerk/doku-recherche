import assert from "node:assert/strict";
import test from "node:test";
import {
  buildInlineLinkUrl,
  type ContentRecord,
  type ResolvedUrl
} from "@signalwerk/minicms/content";
import {
  imageLinkHref,
  resolvedUrlValue
} from "../src/components/Image/imageLink.ts";

function page(
  contentId: string,
  parentId: string | null,
  slug: string,
  options: { hidden?: boolean; type?: "page" | "shortcut" } = {}
): ContentRecord {
  return {
    id: contentId,
    type: options.type ?? "page",
    order: 0,
    properties: {
      content_id: contentId,
      parent_id: parentId,
      slug,
      hidden: options.hidden ?? false
    },
    slots: {}
  };
}

function internalUrl(
  ref = "target",
  target = page("target", "home", "target")
): ResolvedUrl {
  return {
    url: buildInlineLinkUrl("pages", ref),
    link: {
      collection: "pages",
      ref,
      record: target,
      ancestors: [page("home", null, "")]
    }
  };
}

test("normalizes URL properties and preserves ordinary HTTP(S) links", () => {
  assert.deepEqual(resolvedUrlValue("https://example.com/a?b=1#c"), {
    url: "https://example.com/a?b=1#c",
    link: null
  });
  assert.equal(
    imageLinkHref({ url: "https://example.com/a?b=1#c", link: null }, "/repo/"),
    "https://example.com/a?b=1#c"
  );
  assert.equal(
    imageLinkHref({ url: " https://example.com/spaced ", link: null }, "/"),
    " https://example.com/spaced "
  );
  assert.equal(
    imageLinkHref({ url: "javascript:alert(1)", link: null }, "/"),
    null
  );
});

test("derives internal image links from current page hierarchy and base path", () => {
  assert.equal(imageLinkHref(internalUrl(), "/repo/"), "/repo/target");
  assert.equal(
    imageLinkHref(internalUrl("target", page("target", "home", "moved")), "/repo/"),
    "/repo/moved"
  );
});

test("fails internal image links closed without exact, public page metadata", () => {
  const canonical = buildInlineLinkUrl("pages", "target");
  assert.equal(imageLinkHref({ url: canonical, link: null }, "/"), null);
  assert.equal(
    imageLinkHref(
      { ...internalUrl(), url: buildInlineLinkUrl("pages", "other") },
      "/"
    ),
    null
  );
  assert.equal(
    imageLinkHref(internalUrl("target", page("other", "home", "target")), "/"),
    null
  );
  assert.equal(
    imageLinkHref(
      internalUrl("target", page("target", "home", "target", { hidden: true })),
      "/"
    ),
    null
  );
  assert.equal(
    imageLinkHref(
      internalUrl(
        "target",
        page("target", "home", "target", { type: "shortcut" })
      ),
      "/"
    ),
    null
  );
  assert.equal(
    imageLinkHref({ url: "minicms://link/pages/%ZZ", link: null }, "/"),
    null
  );
});
