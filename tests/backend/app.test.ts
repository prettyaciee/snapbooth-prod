import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import app from "../../backend/src/app";
import {
  registerRequestMiddlewares,
  registerTerminalMiddlewares,
} from "../../backend/src/middlewares";
import { withServer } from "./helpers/http";

test("POST /api/rooms returns 201 for a valid room request", async () => {
  await withServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupSize: 2 }),
    });

    const body = await res.json();

    assert.equal(res.status, 201);
    assert.equal(typeof body.roomId, "string");
    assert.equal(typeof body.hostId, "string");
    assert.equal(body.groupSize, 2);
  });
});

test("unknown API routes return a JSON 404", async () => {
  await withServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/does-not-exist`);

    assert.equal(res.status, 404);
    assert.deepEqual(await res.json(), { error: "Not found" });
  });
});

test("terminal middleware converts thrown errors into JSON 500", async () => {
  const testApp = express();

  registerRequestMiddlewares(testApp);
  testApp.get("/boom", () => {
    throw new Error("boom");
  });
  registerTerminalMiddlewares(testApp);

  await withServer(testApp, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/boom`);

    assert.equal(res.status, 500);
    assert.deepEqual(await res.json(), { error: "Internal server error" });
  });
});
