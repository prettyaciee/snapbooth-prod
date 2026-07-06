import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

type RootPackageJson = {
  scripts?: Record<string, string>;
};

function readRootPackageJson(): RootPackageJson {
  return JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as RootPackageJson;
}

test("root build script targets the backend workspace for deployment safety", () => {
  const packageJson = readRootPackageJson();

  assert.equal(packageJson.scripts?.build, "npm run build:backend");
});

test("root build:all script remains available for full monorepo builds", () => {
  const packageJson = readRootPackageJson();

  assert.equal(
    packageJson.scripts?.["build:all"],
    "npm run build -w frontend && npm run build -w backend",
  );
});
