import assert from "node:assert/strict";
import test from "node:test";
import type { ContentNode } from "@signalwerk/minicms/content";
import {
  accordionOpen,
  boundedImageCrop,
  cssCropStyle,
  hiddenBoundaryValue,
  normalizeImageReference,
  parseTitleElement,
  presentationCrop,
  resolveImagePresentation,
  shouldRenderNode
} from "../src/render/model.ts";

function node(properties: Record<string, unknown>): Pick<ContentNode, "properties"> {
  return { properties };
}

test("title parsing accepts the configured safe forms", () => {
  assert.deepEqual(parseTitleElement("h1"), { tag: "h1" });
  assert.deepEqual(parseTitleElement("h6"), { tag: "h6" });
  assert.deepEqual(parseTitleElement("p.eyebrow.archive-note"), {
    tag: "p",
    className: "eyebrow archive-note"
  });
  assert.deepEqual(parseTitleElement("none"), { tag: "span" });
});

test("title parsing rejects unsafe tags and class fragments", () => {
  for (const value of [
    "script",
    "p.eyebrow onclick=alert(1)",
    "p.foo/bar",
    "p..foo",
    "h2.fake",
    "P.eyebrow",
    null
  ]) {
    assert.deepEqual(parseTitleElement(value), { tag: "h2" });
  }
});

test("hidden nodes disappear publicly and remain marked in authoring", () => {
  const hidden = node({ hidden: true });
  const visible = node({ hidden: false });

  assert.equal(shouldRenderNode(hidden, false), false);
  assert.equal(shouldRenderNode(hidden, true), true);
  assert.equal(hiddenBoundaryValue(hidden, true), "true");
  assert.equal(hiddenBoundaryValue(hidden, false), undefined);
  assert.equal(shouldRenderNode(visible, false), true);
  assert.equal(hiddenBoundaryValue(visible, true), undefined);
});

test("resolved image references prefer explicit overrides and retain selections", () => {
  const image = normalizeImageReference(
    {
      ref: "published-image-id",
      record: {
        id: "published-image",
        type: "media_image",
        properties: {
          alt: "Library alternative",
          caption: "Library caption",
          file: {
            hash: "a".repeat(64),
            filename: "archive.jpg",
            src: "/media/a/archive.jpg",
            width: 1200,
            height: 800
          }
        },
        slots: {}
      },
      selections: {
        crop: {
          ref: "crop-id",
          value: { x: 100, y: 80, width: 640, height: 480, rotation: 15 }
        },
        focus: {
          ref: "focus-id",
          value: { x: 410, y: 265 }
        }
      }
    },
    { alt: "", caption: "Node caption" }
  );

  assert.equal(image.ref, "published-image-id");
  assert.equal(image.src, "/media/a/archive.jpg");
  assert.equal(image.alt, "Library alternative", "empty defaults do not erase library text");
  assert.equal(image.caption, "Node caption");
  assert.deepEqual(image.focus, { x: 410, y: 265 });
  assert.deepEqual(image.crop, {
    x: 100,
    y: 80,
    width: 640,
    height: 480,
    rotation: 15
  });
});

test("missing and malformed references become bounded authoring states", () => {
  const missing = normalizeImageReference({
    ref: "missing-id",
    record: null,
    selections: {}
  });
  assert.equal(missing.src, null);
  assert.match(missing.missingReason ?? "", /missing-id/);

  const malformed = normalizeImageReference({
    ref: "bad-source",
    record: {
      properties: {
        file: {
          hash: "a".repeat(64),
          filename: "bad.jpg",
          src: "javascript:alert(1)",
          width: Number.POSITIVE_INFINITY,
          height: -5
        }
      }
    }
  });
  assert.equal(malformed.src, null);
  assert.equal(malformed.width, null);
  assert.equal(malformed.height, null);
});

test("crop normalization clamps rotated geometry to the source bounds", () => {
  const crop = boundedImageCrop(
    { x: -100, y: -60, width: 900, height: 700, rotation: 30 },
    { width: 800, height: 600 }
  );
  assert.ok(crop);
  assert.ok(crop.width >= 1 && crop.width <= 800);
  assert.ok(crop.height >= 1 && crop.height <= 600);

  const radians = (crop.rotation * Math.PI) / 180;
  const boundsWidth = Math.abs(Math.cos(radians)) * crop.width
    + Math.abs(Math.sin(radians)) * crop.height;
  const boundsHeight = Math.abs(Math.sin(radians)) * crop.width
    + Math.abs(Math.cos(radians)) * crop.height;
  const centerX = crop.x + crop.width / 2;
  const centerY = crop.y + crop.height / 2;
  assert.ok(centerX - boundsWidth / 2 >= -1e-8);
  assert.ok(centerX + boundsWidth / 2 <= 800 + 1e-8);
  assert.ok(centerY - boundsHeight / 2 >= -1e-8);
  assert.ok(centerY + boundsHeight / 2 <= 600 + 1e-8);
});

test("ratio crops follow focus and stay inside the selected crop", () => {
  const selected = { x: 100, y: 50, width: 600, height: 400, rotation: 0 };
  const square = presentationCrop(
    { width: 1000, height: 700 },
    selected,
    { x: 675, y: 250 },
    "square"
  );
  assert.deepEqual(square, {
    x: 300,
    y: 50,
    width: 400,
    height: 400,
    rotation: 0
  });
});

test("canonical service URLs receive a prepended crop and raw URLs use CSS", () => {
  const source = {
    ref: "image-id",
    src: `/v1/media/images/${"a".repeat(64)}/resize@width:1600,height:900,fit:inside;quality@82/photo.jpg`,
    filename: "photo.jpg",
    alt: "Archive",
    caption: "",
    width: 1200,
    height: 800,
    crop: { x: 100, y: 80, width: 640, height: 480, rotation: 0 },
    focus: null,
    missingReason: null
  };
  const service = resolveImagePresentation(source, "original");
  assert.equal(service.serviceCropApplied, true);
  assert.match(service.displaySrc ?? "", /crop@left:100,top:80,width:640,height:480;/);
  assert.equal(service.cropStyle, null);

  const raw = resolveImagePresentation({ ...source, src: "/media/a/photo.jpg" });
  assert.equal(raw.serviceCropApplied, false);
  assert.ok(raw.cropStyle);
  assert.equal(raw.cropStyle?.width, "187.5%");

  const bounded = cssCropStyle(
    { width: 100_000, height: 100_000 },
    { x: 0, y: 0, width: 1, height: 1, rotation: 0 }
  );
  assert.equal(bounded?.width, "5000%", "CSS magnification is capped");
});

test("accordions are forced open only while authoring", () => {
  assert.equal(accordionOpen(true), true);
  assert.equal(accordionOpen(false), undefined);
});
