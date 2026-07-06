export type RoomPhase = "fetching" | "name_entry" | "ready";

type RoomIdentity = {
  routeRoomId?: string;
  storedRoomId?: string;
  myName?: string;
};

function hasStoredIdentityForRoom({ routeRoomId, storedRoomId, myName }: RoomIdentity): boolean {
  return Boolean(
    routeRoomId &&
    storedRoomId === routeRoomId &&
    myName?.trim(),
  );
}

export function resolveInitialRoomPhase(identity: RoomIdentity): RoomPhase {
  return hasStoredIdentityForRoom(identity) ? "ready" : "fetching";
}

export function resolveFetchedRoomPhase(identity: RoomIdentity): Extract<RoomPhase, "name_entry" | "ready"> {
  return hasStoredIdentityForRoom(identity) ? "ready" : "name_entry";
}
