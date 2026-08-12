import { readFile } from "node:fs/promises";
import path from "node:path";

import type { APIRoute } from "astro";

export const prerender = true;

export const GET: APIRoute = async () => {
  const source = await readFile(
    path.join(__PROJECT_ROOT__, "cms.config.yml"),
    "utf8"
  );

  return new Response(source, {
    headers: {
      "content-type": "application/yaml; charset=utf-8"
    }
  });
};
