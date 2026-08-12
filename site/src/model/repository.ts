import { createFilesystemContentAdapter } from "@signalwerk/minicms/content/fs";
import type {
  CmsCollection,
  CmsConfig,
  ContentData,
  ContentRecord
} from "@signalwerk/minicms/content";

export interface RepositorySnapshot {
  config: CmsConfig;
  collection: CmsCollection;
  pages: ContentData[];
}

let productionSnapshot: Promise<RepositorySnapshot> | undefined;

async function readRepository(): Promise<RepositorySnapshot> {
  const development = import.meta.env.DEV;
  const publicBase = development
    ? __MINICMS_API_ORIGIN__
    : import.meta.env.BASE_URL;
  const adapter = await createFilesystemContentAdapter({
    projectRoot: __PROJECT_ROOT__,
    publicBase,
    ...(development
      ? { imageServiceBaseUrl: __MINICMS_API_ORIGIN__ }
      : {})
  });
  const result = await adapter.list("pages");

  return {
    config: result.config,
    collection: result.collection,
    pages: result.items.map((item: ContentRecord) => ({
      config: result.config,
      collection: result.collection,
      item
    }))
  };
}

/**
 * Read resolved project content. A production build shares one immutable
 * snapshot; development intentionally goes back to disk for every request.
 */
export function loadRepository(): Promise<RepositorySnapshot> {
  if (import.meta.env.DEV) return readRepository();
  productionSnapshot ??= readRepository();
  return productionSnapshot;
}
