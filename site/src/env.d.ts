/// <reference types="astro/client" />

declare const __PROJECT_ROOT__: string;
declare const __MINICMS_API_ORIGIN__: string;
declare const __MINICMS_ADMIN_PORT__: string;
declare const __MINICMS_DEV_SCRIPT_URL__: string;
declare const __MINICMS_SCRIPT_URL__: string;

declare module "*.scss?inline" {
  const stylesheet: string;
  export default stylesheet;
}

declare module "@signalwerk/minicms/core/content" {
  import type { CmsConfig } from "@signalwerk/minicms/content";

  export function parseYaml(source: string): unknown;
  export function validateSourceConfig(
    config: unknown,
    status?: number
  ): CmsConfig;
}
