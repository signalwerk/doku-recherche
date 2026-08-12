import type {
  ContentRecord,
  ResolvedReference
} from "@signalwerk/minicms/content";

/** A canonical, base-independent public route path. */
export type RoutePath = `/${string}`;

export interface RouteManifestOptions {
  /** Astro's base path (normally `import.meta.env.BASE_URL`). */
  basePath?: string;
}

interface RouteEntryBase {
  /** Stable path used in getStaticPaths props and manifest lookups. */
  path: RoutePath;
  /** Public URL including the configured Astro base path. */
  href: string;
  segment: string;
  contentId: string;
  parentContentId: string | null;
  record: ContentRecord;
}

export interface PageRoute extends RouteEntryBase {
  kind: "page";
}

export interface RedirectRoute extends RouteEntryBase {
  kind: "redirect";
  /** Stable, base-independent path of the final page in the shortcut chain. */
  targetPath: RoutePath;
  /** Redirect destination including the configured Astro base path. */
  redirectTo: string;
}

export type PublicRoute = PageRoute | RedirectRoute;

export interface RouteStaticPath {
  params: { path: string | undefined };
  props: { routePath: RoutePath };
}

export interface RouteManifest {
  basePath: string;
  routes: readonly PublicRoute[];
  paths: readonly RoutePath[];
  byPath: ReadonlyMap<RoutePath, PublicRoute>;
  /** Look up a route by its stable, base-independent path. */
  lookup(path: string): PublicRoute | undefined;
  /** Turn a stable internal route path into a base-aware public URL. */
  href(path: string): string;
  /** Astro paths whose props intentionally retain no content snapshot. */
  staticPaths(): RouteStaticPath[];
}

export class RouteManifestError extends Error {
  override name = "RouteManifestError";
}

interface HierarchyNode {
  record: ContentRecord;
  contentId: string;
  parentContentId: string | null;
  parent: HierarchyNode | null;
  children: HierarchyNode[];
  segment: string;
  inputIndex: number;
  path?: RoutePath;
  public?: boolean;
}

type ReferenceLike = Partial<ResolvedReference> & {
  record?: ContentRecord | null;
};

function fail(message: string): never {
  throw new RouteManifestError(message);
}

function stringProperty(
  record: ContentRecord,
  property: string,
  { empty = false }: { empty?: boolean } = {}
): string {
  const value = record.properties[property];
  if (typeof value !== "string" || (!empty && !value.trim())) {
    fail(
      `Route record "${record.id}" must define a${empty ? " string" : " non-empty string"} properties.${property}.`
    );
  }
  return value;
}

/**
 * Normalize a CMS slug into one URL path segment. Leading, trailing, and
 * repeated separators are discarded; separators inside a slug become dashes.
 */
export function normalizeSlugSegment(slug: unknown): string {
  if (typeof slug !== "string") {
    throw new RouteManifestError("A route slug must be a string.");
  }
  return slug
    .trim()
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean)
    .join("-");
}

/** Normalize a stable route path for collision checks and lookups. */
export function normalizeRoutePath(path: string): RoutePath {
  if (typeof path !== "string") {
    throw new RouteManifestError("A route path must be a string.");
  }
  const value = path.trim();
  if (!value || value === "/") return "/";
  if (value.includes("?") || value.includes("#")) {
    throw new RouteManifestError(
      `Route path "${path}" must not contain a query string or fragment.`
    );
  }
  const segments = value.split("/").filter(Boolean);
  return `/${segments.join("/")}`;
}

/** Normalize Astro's BASE_URL to an empty string or a leading-slash prefix. */
export function normalizeBasePath(basePath = ""): string {
  const value = basePath.trim();
  if (!value || value === "/") return "";
  if (value.includes("://") || value.includes("?") || value.includes("#")) {
    throw new RouteManifestError(
      `Base path "${basePath}" must be a URL path, not an absolute URL.`
    );
  }
  const normalized = `/${value.split("/").filter(Boolean).join("/")}`;
  return normalized === "/" ? "" : normalized;
}

/** Apply an Astro base path to a stable internal route path. */
export function withBasePath(path: string, basePath = ""): string {
  const stablePath = normalizeRoutePath(path);
  const base = normalizeBasePath(basePath);
  if (!base) return stablePath;
  return stablePath === "/" ? `${base}/` : `${base}${stablePath}`;
}

function contentId(record: ContentRecord): string {
  return stringProperty(record, "content_id").trim();
}

function parentContentId(record: ContentRecord): string | null {
  const value = record.properties.parent_id;
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || !value.trim()) {
    fail(
      `Route record "${record.id}" has an invalid properties.parent_id.`
    );
  }
  return value.trim();
}

function orderOf(node: HierarchyNode): number {
  return Number.isFinite(node.record.order) ? node.record.order : 0;
}

function hierarchyOrder(left: HierarchyNode, right: HierarchyNode): number {
  return orderOf(left) - orderOf(right) || left.inputIndex - right.inputIndex;
}

function routePath(segments: readonly string[]): RoutePath {
  const present = segments.filter(Boolean);
  return present.length ? `/${present.join("/")}` : "/";
}

function selectedTargetId(record: ContentRecord): string | null {
  const target = record.properties.target;
  if (typeof target === "string") return target.trim() || null;
  if (typeof target === "number" || typeof target === "boolean") {
    return String(target);
  }
  if (!target || typeof target !== "object" || Array.isArray(target)) {
    return null;
  }

  const reference = target as ReferenceLike;
  if (
    typeof reference.ref === "string" ||
    typeof reference.ref === "number" ||
    typeof reference.ref === "boolean"
  ) {
    const ref = String(reference.ref).trim();
    if (ref) return ref;
  }

  const resolvedId = reference.record?.properties.content_id;
  return typeof resolvedId === "string" && resolvedId.trim()
    ? resolvedId.trim()
    : null;
}

/**
 * Build and validate all public routes from the pages collection. The returned
 * `path` values never include the deployment base and are therefore safe to
 * retain in Astro getStaticPaths props across development requests.
 */
export function buildRouteManifest(
  records: readonly ContentRecord[],
  options: RouteManifestOptions = {}
): RouteManifest {
  const basePath = normalizeBasePath(options.basePath);
  const nodes = records.map<HierarchyNode>((record, inputIndex) => ({
    record,
    contentId: contentId(record),
    parentContentId: parentContentId(record),
    parent: null,
    children: [],
    segment: normalizeSlugSegment(stringProperty(record, "slug", { empty: true })),
    inputIndex
  }));

  const nodesById = new Map<string, HierarchyNode>();
  for (const node of nodes) {
    const duplicate = nodesById.get(node.contentId);
    if (duplicate) {
      fail(
        `Duplicate hierarchy content_id "${node.contentId}" on route records "${duplicate.record.id}" and "${node.record.id}".`
      );
    }
    nodesById.set(node.contentId, node);
  }

  for (const node of nodes) {
    if (!node.parentContentId) continue;
    const parent = nodesById.get(node.parentContentId);
    if (!parent) {
      fail(
        `Route record "${node.record.id}" references missing parent content_id "${node.parentContentId}".`
      );
    }
    node.parent = parent;
    parent.children.push(node);
  }
  for (const node of nodes) node.children.sort(hierarchyOrder);

  const hierarchyState = new Map<HierarchyNode, "visiting" | "done">();
  const resolveHierarchy = (
    node: HierarchyNode,
    trail: readonly HierarchyNode[] = []
  ): void => {
    const state = hierarchyState.get(node);
    if (state === "done") return;
    if (state === "visiting") {
      const start = trail.indexOf(node);
      const cycle = [...trail.slice(Math.max(0, start)), node]
        .map((entry) => entry.contentId)
        .join(" -> ");
      fail(`Route hierarchy cycle detected: ${cycle}.`);
    }

    hierarchyState.set(node, "visiting");
    if (node.parent) resolveHierarchy(node.parent, [...trail, node]);

    const ancestors: string[] = [];
    let parent = node.parent;
    while (parent) {
      ancestors.unshift(parent.segment);
      parent = parent.parent;
    }
    node.path = routePath([...ancestors, node.segment]);
    node.public =
      node.record.properties.hidden !== true &&
      (node.parent === null || node.parent.public === true);
    hierarchyState.set(node, "done");
  };

  for (const node of nodes) resolveHierarchy(node);

  const publicNodesByPath = new Map<RoutePath, HierarchyNode>();
  for (const node of nodes) {
    if (!node.public || !node.path) continue;
    const duplicate = publicNodesByPath.get(node.path);
    if (duplicate) {
      fail(
        `Duplicate public route path "${node.path}" for records "${duplicate.record.id}" and "${node.record.id}".`
      );
    }
    publicNodesByPath.set(node.path, node);
  }

  const shortcutTargets = new Map<HierarchyNode, HierarchyNode>();
  const shortcutState = new Map<HierarchyNode, "visiting" | "done">();
  const resolveShortcut = (
    node: HierarchyNode,
    trail: readonly HierarchyNode[] = []
  ): HierarchyNode => {
    if (node.record.type === "page") return node;
    if (node.record.type !== "shortcut") {
      fail(
        `Public route record "${node.record.id}" has unsupported type "${node.record.type}".`
      );
    }

    const cached = shortcutTargets.get(node);
    if (cached) return cached;
    if (shortcutState.get(node) === "visiting") {
      const start = trail.indexOf(node);
      const cycle = [...trail.slice(Math.max(0, start)), node]
        .map((entry) => entry.contentId)
        .join(" -> ");
      fail(`Shortcut cycle detected: ${cycle}.`);
    }

    shortcutState.set(node, "visiting");
    const mode = node.record.properties.mode;
    let directTarget: HierarchyNode | undefined;

    if (mode === "first_child") {
      directTarget = node.children.find((child) => child.public === true);
      if (!directTarget) {
        fail(
          `Shortcut "${node.record.id}" has no visible child to redirect to.`
        );
      }
    } else if (mode === "selected_target") {
      const targetId = selectedTargetId(node.record);
      if (!targetId) {
        fail(`Shortcut "${node.record.id}" has no selected target.`);
      }
      directTarget = nodesById.get(targetId);
      if (!directTarget) {
        fail(
          `Shortcut "${node.record.id}" targets missing content_id "${targetId}".`
        );
      }
      if (!directTarget.public) {
        fail(
          `Shortcut "${node.record.id}" targets hidden page "${directTarget.record.id}".`
        );
      }
    } else {
      fail(
        `Shortcut "${node.record.id}" has unsupported mode "${String(mode)}".`
      );
    }

    const target = resolveShortcut(directTarget, [...trail, node]);
    shortcutTargets.set(node, target);
    shortcutState.set(node, "done");
    return target;
  };

  const orderedPublicNodes: HierarchyNode[] = [];
  const appendPublicTree = (node: HierarchyNode): void => {
    if (!node.public) return;
    orderedPublicNodes.push(node);
    for (const child of node.children) appendPublicTree(child);
  };
  for (const root of nodes
    .filter((node) => node.parent === null)
    .sort(hierarchyOrder)) {
    appendPublicTree(root);
  }

  const routes = orderedPublicNodes.map<PublicRoute>((node) => {
    const path = node.path as RoutePath;
    const common: RouteEntryBase = {
      path,
      href: withBasePath(path, basePath),
      segment: node.segment,
      contentId: node.contentId,
      parentContentId: node.parentContentId,
      record: node.record
    };

    if (node.record.type === "page") return { ...common, kind: "page" };
    const target = resolveShortcut(node);
    const targetPath = target.path as RoutePath;
    return {
      ...common,
      kind: "redirect",
      targetPath,
      redirectTo: withBasePath(targetPath, basePath)
    };
  });

  const byPath = new Map<RoutePath, PublicRoute>(
    routes.map((route) => [route.path, route])
  );
  return {
    basePath,
    routes,
    paths: routes.map((route) => route.path),
    byPath,
    lookup(path) {
      return byPath.get(normalizeRoutePath(path));
    },
    href(path) {
      return withBasePath(path, basePath);
    },
    staticPaths() {
      return routes.map((route) => ({
        params: {
          path: route.path === "/" ? undefined : route.path.slice(1)
        },
        props: { routePath: route.path }
      }));
    }
  };
}
