import assert from "node:assert/strict";
import test from "node:test";

import {
  getDevelopmentApiOrigin,
  normalizeApiOrigin
} from "../src/model/api-origin.ts";

test("defaults to the loopback API and honors PORT", () => {
  assert.equal(
    getDevelopmentApiOrigin(undefined, undefined),
    "http://127.0.0.1:8787"
  );
  assert.equal(
    getDevelopmentApiOrigin("", "9000"),
    "http://127.0.0.1:9000"
  );
});

test("canonicalizes allowed HTTP loopback origins", () => {
  assert.equal(normalizeApiOrigin("http://LOCALHOST:80"), "http://localhost");
  assert.equal(
    normalizeApiOrigin("http://127.42.9.8:8787"),
    "http://127.42.9.8:8787"
  );
  assert.equal(
    normalizeApiOrigin("http://[::1]:8787"),
    "http://[::1]:8787"
  );
});

test("requires HTTPS away from loopback", () => {
  assert.throws(
    () => normalizeApiOrigin("http://cms.example.com:8787"),
    /must use HTTPS/
  );
  assert.equal(
    normalizeApiOrigin("https://cms.example.com:443"),
    "https://cms.example.com"
  );
});

test("rejects values that are not exact HTTP origins", () => {
  for (const value of [
    "cms.example.com",
    "ftp://cms.example.com",
    "https://user:secret@cms.example.com",
    "https://cms.example.com/api",
    "https://cms.example.com/?mode=dev",
    "https://cms.example.com/#api"
  ]) {
    assert.throws(() => normalizeApiOrigin(value));
  }
});
