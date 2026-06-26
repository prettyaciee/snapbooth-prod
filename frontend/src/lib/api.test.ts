import test from "node:test";
import assert from "node:assert/strict";
import { buildApiUrl, buildWebSocketUrl } from "./api";

test("buildApiUrl falls back to the local development API base URL when no API base URL is configured", () => {
  assert.equal(buildApiUrl("/rooms", ""), "http://localhost:3001/api/rooms");
});

test("buildApiUrl prefixes configured API base URL and trims trailing slash", () => {
  assert.equal(
    buildApiUrl("/rooms", "https://snapbooth-api.onrender.com/api/"),
    "https://snapbooth-api.onrender.com/api/rooms",
  );
});

test("buildWebSocketUrl derives a secure websocket URL from the configured API base URL", () => {
  assert.equal(
    buildWebSocketUrl(
      "/ws?roomId=ROOM1",
      "https://snapbooth-api.onrender.com/api/",
      "https://snapbooth.netlify.app",
      "snapbooth.netlify.app",
    ),
    "wss://snapbooth-api.onrender.com/api/ws?roomId=ROOM1",
  );
});

test("buildWebSocketUrl falls back to the local development websocket URL when no API base URL is configured", () => {
  assert.equal(
    buildWebSocketUrl("/ws?roomId=ROOM1", "", "https://snapbooth.netlify.app", "snapbooth.netlify.app"),
    "ws://localhost:3001/api/ws?roomId=ROOM1",
  );
});
