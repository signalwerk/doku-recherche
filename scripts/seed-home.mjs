import { access, mkdir, readFile, writeFile } from "node:fs/promises";

import {
  dumpYaml,
  parseYaml,
  validateRecord,
  validateSourceConfig
} from "../miniCMS/core/content.js";
import { createId } from "../miniCMS/core/id.js";

const homePath = new URL("../content/pages/home.yml", import.meta.url);

try {
  await access(homePath);
  console.log("content/pages/home.yml already exists; nothing to seed.");
  process.exit(0);
} catch {
  // The first run creates the initial record below.
}

const config = validateSourceConfig(
  parseYaml(await readFile(new URL("../cms.config.yml", import.meta.url), "utf8"))
);
const usedIds = new Set();
const record = {
  id: "home",
  type: "page",
  order: 0,
  properties: {
    content_id: createId(usedIds),
    parent_id: null,
    title: "Dokumentationsstelle für historische Recherchen",
    slug: "",
    navigation_title: "Startseite",
    hidden: false,
    hide_in_navigation: false,
    description: "Dokumentationsstelle für historische Recherchen in Zürich.",
    keywords: "Geschichte, Recherche, Dokumentation, Zürich",
    noindex: false,
    nofollow: false,
    layout: "default"
  },
  slots: {
    content: [
      {
        id: createId(usedIds),
        type: "title",
        properties: {
          title: "Geschichte recherchieren, dokumentieren und zugänglich machen",
          element: "h2",
          hidden: false
        },
        slots: {}
      },
      {
        id: createId(usedIds),
        type: "text",
        properties: {
          text: "Diese Website befindet sich im Aufbau. Inhalte können direkt mit miniCMS bearbeitet und als statische Seiten veröffentlicht werden.",
          hidden: false
        },
        slots: {}
      }
    ]
  }
};

validateRecord(record, config.collections.pages, config);

for (const directory of ["pages", "images", "files", "media"]) {
  await mkdir(new URL(`../content/${directory}/`, import.meta.url), {
    recursive: true
  });
}

await writeFile(homePath, dumpYaml(record), "utf8");
console.log("Seeded content/pages/home.yml");
