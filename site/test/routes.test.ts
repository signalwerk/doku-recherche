import assert from "node:assert/strict";
import test from "node:test";

import type { ContentRecord } from "@signalwerk/minicms/content";

import {
  RouteManifestError,
  buildRouteManifest,
  normalizeSlugSegment,
  resolvedPageLinkHref,
  resolvedPageLinkPath,
  withBasePath
} from "../src/model/routes.ts";

type RecordOptions = {
  id?: string;
  parent?: string | null;
  slug?: string;
  hidden?: boolean;
  order?: number;
  type?: "page" | "shortcut";
  mode?: "first_child" | "selected_target";
  target?: unknown;
};

function record(contentId: string, options: RecordOptions = {}): ContentRecord {
  const type = options.type ?? "page";
  return {
    id: options.id ?? contentId,
    type,
    order: options.order ?? 0,
    properties: {
      content_id: contentId,
      parent_id: options.parent ?? null,
      title: contentId,
      slug: options.slug ?? contentId,
      hidden: options.hidden ?? false,
      ...(type === "shortcut"
        ? {
            mode: options.mode ?? "first_child",
            target: options.target ?? ""
          }
        : {})
    },
    slots: {}
  };
}

test("builds stable paths from content hierarchy and normalized segments", () => {
  const manifest = buildRouteManifest([
    record("home", { slug: "" }),
    record("about", { parent: "home", slug: "/about/" }),
    record("team", { parent: "about", slug: " team " })
  ]);

  assert.deepEqual(manifest.paths, ["/", "/about", "/about/team"]);
  assert.equal(manifest.lookup("about/team/")?.contentId, "team");
  assert.equal(manifest.lookup("/")?.record.id, "home");
  assert.equal(normalizeSlugSegment("/one/two/"), "one-two");
  assert.deepEqual(manifest.staticPaths(), [
    { params: { path: undefined }, props: { routePath: "/" } },
    { params: { path: "about" }, props: { routePath: "/about" } },
    {
      params: { path: "about/team" },
      props: { routePath: "/about/team" }
    }
  ]);
});

test("fails when a hierarchy cycle prevents route construction", () => {
  assert.throws(
    () =>
      buildRouteManifest([
        record("alpha", { parent: "bravo" }),
        record("bravo", { parent: "alpha" })
      ]),
    (error: unknown) =>
      error instanceof RouteManifestError && /hierarchy cycle/i.test(error.message)
  );
});

test("fails when a parent is missing", () => {
  assert.throws(
    () => buildRouteManifest([record("orphan", { parent: "absent" })]),
    /missing parent content_id "absent"/i
  );
});

test("fails rather than overwriting duplicate normalized public paths", () => {
  assert.throws(
    () =>
      buildRouteManifest([
        record("home", { slug: "" }),
        record("first", { parent: "home", slug: "/news/" }),
        record("second", { parent: "home", slug: "news" })
      ]),
    /duplicate public route path "\/news"/i
  );
});

test("omits hidden records and their complete subtrees", () => {
  const manifest = buildRouteManifest([
    record("home", { slug: "" }),
    record("hidden", { parent: "home", hidden: true }),
    record("descendant", { parent: "hidden", hidden: false }),
    record("visible", { parent: "home" })
  ]);

  assert.deepEqual(manifest.paths, ["/", "/visible"]);
  assert.equal(manifest.lookup("/hidden"), undefined);
  assert.equal(manifest.lookup("/hidden/descendant"), undefined);
});

test("first_child shortcuts skip hidden children and redirect to the first visible child", () => {
  const manifest = buildRouteManifest([
    record("home", { slug: "" }),
    record("shortcut", {
      parent: "home",
      slug: "go",
      type: "shortcut",
      mode: "first_child"
    }),
    record("hidden", {
      parent: "shortcut",
      hidden: true,
      order: 0
    }),
    record("visible", {
      parent: "shortcut",
      slug: "destination",
      order: 1
    })
  ]);

  const route = manifest.lookup("/go");
  assert.equal(route?.kind, "redirect");
  if (route?.kind === "redirect") {
    assert.equal(route.targetPath, "/go/destination");
    assert.equal(route.redirectTo, "/go/destination");
  }
});

test("selected_target and first_child shortcut chains resolve to a visible page", () => {
  const manifest = buildRouteManifest([
    record("home", { slug: "" }),
    record("selected", {
      parent: "home",
      slug: "selected",
      type: "shortcut",
      mode: "selected_target",
      target: { ref: "middle", record: null, selections: {} }
    }),
    record("middle", {
      parent: "home",
      slug: "middle",
      type: "shortcut",
      mode: "first_child"
    }),
    record("final", { parent: "middle", slug: "final" })
  ]);

  const selected = manifest.lookup("/selected");
  const middle = manifest.lookup("/middle");
  assert.equal(selected?.kind, "redirect");
  assert.equal(middle?.kind, "redirect");
  if (selected?.kind === "redirect" && middle?.kind === "redirect") {
    assert.equal(selected.targetPath, "/middle/final");
    assert.equal(middle.targetPath, "/middle/final");
  }
});

test("fails shortcut cycles without recursing indefinitely", () => {
  assert.throws(
    () =>
      buildRouteManifest([
        record("one", {
          type: "shortcut",
          mode: "selected_target",
          target: "two"
        }),
        record("two", {
          type: "shortcut",
          mode: "selected_target",
          target: "one"
        })
      ]),
    /shortcut cycle/i
  );
});

test("applies the Astro base path to route hrefs and shortcut redirects", () => {
  const manifest = buildRouteManifest(
    [
      record("home", { slug: "" }),
      record("target", { parent: "home", slug: "target" }),
      record("jump", {
        parent: "home",
        slug: "jump",
        type: "shortcut",
        mode: "selected_target",
        target: "target"
      })
    ],
    { basePath: "/repository/" }
  );

  assert.equal(manifest.lookup("/")?.href, "/repository/");
  assert.equal(manifest.lookup("/target")?.href, "/repository/target");
  const shortcut = manifest.lookup("/jump");
  assert.equal(shortcut?.kind, "redirect");
  if (shortcut?.kind === "redirect") {
    assert.equal(shortcut.redirectTo, "/repository/target");
  }
  assert.equal(manifest.href("/target"), "/repository/target");
  assert.equal(withBasePath("/", "/repository/"), "/repository/");
});

test("derives stable page links from the target's current hierarchy", () => {
  const home = record("home", { slug: "" });
  const section = record("section", {
    parent: "home",
    slug: "research"
  });
  const target = record("target", {
    parent: "section",
    slug: "methods"
  });
  const link = {
    collection: "pages",
    ref: "target",
    record: target,
    ancestors: [home, section]
  };

  assert.equal(resolvedPageLinkPath(link), "/research/methods");
  assert.equal(
    resolvedPageLinkHref(link, "/repository/"),
    "/repository/research/methods"
  );

  target.properties.parent_id = "home";
  target.properties.slug = "new-methods";
  assert.equal(
    resolvedPageLinkHref({ ...link, ancestors: [home] }, "/repository/"),
    "/repository/new-methods"
  );
});

test("fails stable links closed for unsafe or incomplete targets", () => {
  const home = record("home", { slug: "" });
  const target = record("target", { parent: "home", slug: "target" });
  const valid = {
    collection: "pages",
    ref: "target",
    record: target,
    ancestors: [home]
  };

  assert.equal(resolvedPageLinkPath({ ...valid, record: null }), null);
  assert.equal(resolvedPageLinkPath({ ...valid, ref: "another" }), null);
  assert.equal(resolvedPageLinkPath({ ...valid, collection: "files" }), null);
  assert.equal(resolvedPageLinkPath({ ...valid, ancestors: [] }), null);
  assert.equal(
    resolvedPageLinkPath({
      ...valid,
      ancestors: [home, home]
    }),
    null
  );
  assert.equal(
    resolvedPageLinkPath({
      ...valid,
      record: record("target", {
        parent: "home",
        slug: "target",
        hidden: true
      })
    }),
    null
  );
  assert.equal(
    resolvedPageLinkPath({
      ...valid,
      record: record("target", {
        parent: "home",
        slug: "target",
        type: "shortcut"
      })
    }),
    null,
    "shortcut destinations require the complete route manifest"
  );
});
