import { useEffect, useRef, useState, useCallback } from "react";
import { usePhotoStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { buildWebSocketUrl } from "@/lib/api";

type UseRoomWsReturn = {
  sendStart: () => void;
  sendPhoto: (data: string, shotIndex: number) => void;
  countdownValue: number | null;
  flash: boolean;
  celebrationPhotos: { participantId: string; name: string; data: string }[] | null;
};

export function useRoomWs(): UseRoomWsReturn {
  const store = usePhotoStore();
  const { toast } = useToast();

  // Use a ref so connect() never captures stale store values
  const storeRef = useRef(store);
  useEffect(() => { storeRef.current = store; }, [store]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const MAX_RECONNECTS = 3;
  const mountedRef = useRef(true);

  const [countdownValue, setCountdownValue] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);
  const [celebrationPhotos, setCelebrationPhotos] = useState<{ participantId: string; name: string; data: string }[] | null>(null);

  const toastRef = useRef(toast);
  useEffect(() => { toastRef.current = toast; }, [toast]);

  const connect = useCallback(() => {
    const s = storeRef.current;
    if (!s.roomId || !s.myParticipantId || !s.myName) return;
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) return;

    const wsUrl = buildWebSocketUrl(
      `/ws?roomId=${encodeURIComponent(s.roomId)}&participantId=${encodeURIComponent(s.myParticipantId)}&name=${encodeURIComponent(s.myName)}&isHost=${s.isHost}`,
    );

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectCountRef.current = 0;
    };

    ws.onmessage = (event) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(event.data as string);
      } catch {
        return;
      }

      const st = storeRef.current;

      switch (msg.type as string) {
        case "room_state":
          st.updateRoomState({
            participants: (msg.participants as { id: string; name: string; isHost: boolean }[]) ?? [],
            status: (msg.status as "waiting" | "countdown" | "capturing" | "done") ?? "waiting",
            shots: (msg.shots as { shotIndex: number; photos: { participantId: string; name: string; data: string }[] }[]) ?? [],
            currentShotIndex: (msg.currentShotIndex as number) ?? 0,
          });
          break;

        case "countdown":
          st.updateRoomState({
            participants: st.participants,
            status: "countdown",
            shots: st.shots,
            currentShotIndex: (msg.shotIndex as number) ?? st.currentShotIndex,
          });
          setCountdownValue(msg.count as number);
          setCelebrationPhotos(null);
          window.dispatchEvent(new CustomEvent("snapbooth-countdown-ui", { detail: { count: msg.count } }));
          break;

        case "capture":
          st.updateRoomState({
            participants: st.participants,
            status: "capturing",
            shots: st.shots,
            currentShotIndex: (msg.shotIndex as number) ?? st.currentShotIndex,
          });
          setCountdownValue(0);
          setFlash(true);
          setTimeout(() => setFlash(false), 200);
          window.dispatchEvent(new CustomEvent("snapbooth-capture", { detail: { shotIndex: msg.shotIndex } }));
          break;

        case "shot_complete":
          st.addShot({
            shotIndex: msg.shotIndex as number,
            photos: msg.photos as { participantId: string; name: string; data: string }[],
          });
          setCelebrationPhotos(msg.photos as { participantId: string; name: string; data: string }[]);
          break;

        case "session_complete":
          st.setAllShots(msg.shots as { shotIndex: number; photos: { participantId: string; name: string; data: string }[] }[]);
          st.updateRoomState({
            participants: st.participants,
            status: "done",
            shots: msg.shots as { shotIndex: number; photos: { participantId: string; name: string; data: string }[] }[],
            currentShotIndex: st.currentShotIndex,
          });
          break;

        case "error":
          toastRef.current({
            title: "Room Error",
            description: msg.message as string,
            variant: "destructive",
          });
          break;
      }
    };

    ws.onclose = (event) => {
      wsRef.current = null;
      if (!mountedRef.current) return;
      if (!event.wasClean && reconnectCountRef.current < MAX_RECONNECTS) {
        reconnectCountRef.current++;
        setTimeout(connect, 1000 * reconnectCountRef.current);
      } else if (!event.wasClean) {
        toastRef.current({
          title: "Connection Lost",
          description: "Could not reconnect to the room. Please refresh.",
          variant: "destructive",
        });
      }
    };

    ws.onerror = () => {
      // onclose will handle reconnect
    };
  }, []); // no deps — reads store via ref

  // Connect once store has the required fields
  useEffect(() => {
    if (store.roomId && store.myParticipantId && store.myName) {
      connect();
    }
  }, [store.roomId, store.myParticipantId, store.myName, connect]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (wsRef.current) {
        wsRef.current.close(1000, "unmounted");
        wsRef.current = null;
      }
    };
  }, []);

  const sendStart = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "start" }));
    }
  }, []);

  const sendPhoto = useCallback((data: string, shotIndex: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "photo", data, shotIndex }));
    }
  }, []);

  return { sendStart, sendPhoto, countdownValue, flash, celebrationPhotos };
}
