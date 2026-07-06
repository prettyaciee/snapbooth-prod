import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveFetchedRoomPhase,
  resolveInitialRoomPhase,
} from "../../../frontend/src/lib/room-phase";

test("resolveInitialRoomPhase starts hosts in ready when their stored room and name match the current room", () => {
  assert.equal(
    resolveInitialRoomPhase({
      routeRoomId: "ROOM123",
      storedRoomId: "ROOM123",
      myName: "Host",
    }),
    "ready",
  );
});

test("resolveInitialRoomPhase starts in fetching when the visitor has no stored room identity", () => {
  assert.equal(
    resolveInitialRoomPhase({
      routeRoomId: "ROOM123",
      storedRoomId: "",
      myName: "",
    }),
    "fetching",
  );
});

test("resolveFetchedRoomPhase keeps a host in ready after room info is fetched", () => {
  assert.equal(
    resolveFetchedRoomPhase({
      routeRoomId: "ROOM123",
      storedRoomId: "ROOM123",
      myName: "Host",
    }),
    "ready",
  );
});

test("resolveFetchedRoomPhase sends new guests to the name entry screen", () => {
  assert.equal(
    resolveFetchedRoomPhase({
      routeRoomId: "ROOM123",
      storedRoomId: "",
      myName: "",
    }),
    "name_entry",
  );
});
