import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { validateCreateRoom } from "../../../backend/src/middlewares/validateCreateRoom";
import { withServer } from "../helpers/http";

test("validateCreateRoom rejects invalid groupSize before the handler runs", async () => {
  const app = express();
  let handlerCalled = false;

  app.use(express.json());
  app.post("/rooms", validateCreateRoom, (_req, res) => {
    handlerCalled = true;
    res.status(204).end();
  });

  await withServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupSize: 9 }),
    });

    assert.equal(res.status, 400);
    assert.deepEqual(await res.json(), {
      error: "groupSize must be an integer between 2 and 6",
    });
  });

  assert.equal(handlerCalled, false);
});

test("validateCreateRoom stores a normalized integer on res.locals", async () => {
  const app = express();

  app.use(express.json());
  app.post("/rooms", validateCreateRoom, (_req, res) => {
    res.json({ groupSize: res.locals.groupSize });
  });

  await withServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupSize: "4" }),
    });

    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { groupSize: 4 });
  });
});
