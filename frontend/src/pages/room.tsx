import { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import {
  Camera,
  Check,
  Copy,
  DoorOpen,
  Play,
  Radio,
  Users,
  X,
} from "lucide-react";
import { usePhotoStore } from "@/lib/store";
import { useRoomWs } from "@/hooks/use-room-ws";
import { useToast } from "@/hooks/use-toast";
import { buildApiUrl } from "@/lib/api";
import { BOOTH_FRAME_COUNT, ROOM_MODE_BY_SIZE } from "@/lib/arcade-ui";
import { capturePhotoWhenReady } from "@/lib/capture-photo";
import { resolveFetchedRoomPhase, resolveInitialRoomPhase, type RoomPhase } from "@/lib/room-phase";

export default function Room() {
  const { roomId } = useParams<{ roomId: string }>();
  const [, setLocation] = useLocation();
  const store = usePhotoStore();
  const { toast } = useToast();

  const initialPhase = resolveInitialRoomPhase({
    routeRoomId: roomId,
    storedRoomId: store.roomId,
    myName: store.myName,
  });
  const [phase, setPhase] = useState<RoomPhase>(initialPhase);
  const [fetchedGroupSize, setFetchedGroupSize] = useState(store.groupSize ?? 0);
  const [joinName, setJoinName] = useState("");
  const [fetchError, setFetchError] = useState(false);

  const myParticipantId = useRef(store.myParticipantId || crypto.randomUUID()).current;
  const roomIdentityRef = useRef({
    storedRoomId: store.roomId,
    myName: store.myName,
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const [flash, setFlash] = useState(false);
  const [countdownDisplay, setCountdownDisplay] = useState<number | null>(null);
  const [celebrationPhotos, setCelebrationPhotos] = useState<
    { participantId: string; name: string; data: string }[] | null
  >(null);
  const [copied, setCopied] = useState(false);
  const { sendStart, sendPhoto } = useRoomWs();

  useEffect(() => {
    roomIdentityRef.current = {
      storedRoomId: store.roomId,
      myName: store.myName,
    };
  }, [store.myName, store.roomId]);

  useEffect(() => {
    if (phase !== "name_entry") return;

    const nextPhase = resolveFetchedRoomPhase({
      routeRoomId: roomId,
      storedRoomId: store.roomId,
      myName: store.myName,
    });

    if (nextPhase === "ready") {
      setPhase("ready");
    }
  }, [phase, roomId, store.myName, store.roomId]);

  useEffect(() => {
    if (phase !== "fetching") return;
    if (!roomId) {
      setLocation("/");
      return;
    }

    fetch(buildApiUrl(`/rooms/${roomId}`))
      .then((response) => {
        if (!response.ok) throw new Error("not found");
        return response.json() as Promise<{ roomId: string; groupSize: number; status: string }>;
      })
      .then((data) => {
        setFetchedGroupSize(data.groupSize);
        setPhase(resolveFetchedRoomPhase({
          routeRoomId: roomId,
          storedRoomId: roomIdentityRef.current.storedRoomId,
          myName: roomIdentityRef.current.myName,
        }));
      })
      .catch(() => {
        setFetchError(true);
        setTimeout(() => setLocation("/"), 2000);
      });
  }, [phase, roomId, setLocation]);

  const handleJoin = () => {
    if (!joinName.trim() || !roomId) return;
    store.setRoomInfo({
      roomId,
      hostId: "",
      myParticipantId,
      myName: joinName.trim(),
      isHost: false,
      groupSize: fetchedGroupSize,
      mode: ROOM_MODE_BY_SIZE[fetchedGroupSize] ?? "Group",
    });
    setPhase("ready");
  };

  useEffect(() => {
    if (phase !== "ready") return;
    let active = true;

    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } },
      })
      .then((stream) => {
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.onloadedmetadata = () => {
            void video.play().catch(() => undefined);
          };
          void video.play().catch(() => undefined);
        }
        setHasPermission(true);
      })
      .catch(() => {
        if (active) setHasPermission(false);
      });

    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) {
        videoRef.current.onloadedmetadata = null;
        videoRef.current.srcObject = null;
      }
    };
  }, [phase]);

  useEffect(() => {
    let active = true;

    const handler = (event: Event) => {
      const { shotIndex } = (event as CustomEvent<{ shotIndex: number }>).detail;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;

      void (async () => {
        const capturedPhoto = await capturePhotoWhenReady(video, canvas);
        if (!active) return;

        if (!capturedPhoto) {
          setCountdownDisplay(null);
          toast({
            title: "Camera not ready",
            description: "We couldn't capture that frame. Keep the preview active and try the next shot again.",
            variant: "destructive",
          });
          return;
        }

        sendPhoto(capturedPhoto, shotIndex);
        setCountdownDisplay(null);
        setFlash(true);
        setTimeout(() => {
          if (active) {
            setFlash(false);
          }
        }, 200);
      })();
    };

    window.addEventListener("snapbooth-capture", handler);
    return () => {
      active = false;
      window.removeEventListener("snapbooth-capture", handler);
    };
  }, [sendPhoto, toast]);

  useEffect(() => {
    const handler = (event: Event) => {
      const { count } = (event as CustomEvent<{ count: number }>).detail;
      setCountdownDisplay(count);
      setCelebrationPhotos(null);
    };

    window.addEventListener("snapbooth-countdown-ui", handler);
    return () => window.removeEventListener("snapbooth-countdown-ui", handler);
  }, []);

  const prevShotsLen = useRef(0);
  useEffect(() => {
    if (store.shots.length > prevShotsLen.current) {
      prevShotsLen.current = store.shots.length;
      const lastShot = store.shots[store.shots.length - 1];
      if (lastShot) {
        setCelebrationPhotos(lastShot.photos);
        setTimeout(() => setCelebrationPhotos(null), 2000);
      }
    }
  }, [store.shots]);

  useEffect(() => {
    if (store.status === "done") {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      setTimeout(() => setLocation("/result"), 600);
    }
  }, [store.status, setLocation]);

  const handleCopy = () => {
    navigator.clipboard.writeText(`${window.location.origin}/room/${roomId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeave = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    store.clear();
    setLocation("/");
  };

  if (phase === "fetching") {
    return (
      <main className="arcade-route min-h-[100dvh] bg-[#2c0707] px-5 text-[#fff4d1]">
        <div className="film-grain" />
        <div className="mx-auto flex min-h-[100dvh] max-w-xl flex-col items-center justify-center text-center">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-[8px] border-[3px] border-[#ffcc3d] bg-[#1a0505]">
            <Radio className="text-[#ffcc3d]" size={26} aria-hidden="true" />
          </div>
          <h1 className="font-serif text-4xl leading-none text-[#ffefb0] [letter-spacing:0]">
            {fetchError ? "Signal lost" : "Finding room"}
          </h1>
          <p className="mt-4 max-w-sm font-bold text-[#ffe8a8]">
            {fetchError ? "Room not found. Returning to the cabinet." : "Tuning into the booth channel."}
          </p>
        </div>
      </main>
    );
  }

  if (phase === "name_entry") {
    return (
      <main className="arcade-route min-h-[100dvh] bg-[#2c0707] px-5 py-8 text-[#fff4d1]">
        <div className="film-grain" />
        <section className="mx-auto grid min-h-[calc(100dvh-4rem)] max-w-5xl items-center gap-8 md:grid-cols-[0.9fr_1.1fr]">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="min-w-0"
          >
            <p className="mb-3 inline-flex border-y border-[#ffcc3d]/50 py-2 text-sm font-bold text-[#ffcc3d]">
              Guest ticket
            </p>
            <h1 className="font-serif text-5xl leading-none text-[#ffefb0] [letter-spacing:0] md:text-7xl">
              Join the booth
            </h1>
            <p className="mt-5 max-w-lg text-lg font-bold leading-8 text-[#ffe8a8]">
              You were invited to a {ROOM_MODE_BY_SIZE[fetchedGroupSize] ?? "Group"} strip session.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-[8px] border-[3px] border-[#20100d] bg-[#fff8df] p-6 text-[#20100d] shadow-[8px_8px_0_#ffcc3d]"
          >
            <label className="mb-3 block text-sm font-bold uppercase text-[#9f1714]">
              Your name on the strip
            </label>
            <input
              type="text"
              value={joinName}
              onChange={(event) => setJoinName(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && handleJoin()}
              placeholder="Enter your name"
              autoFocus
              data-testid="input-guest-name"
              className="mb-5 w-full rounded-[8px] border-[3px] border-[#20100d] bg-white px-4 py-3 text-lg font-bold text-[#20100d] outline-none transition placeholder:text-[#9b8172] focus:border-[#24d8d0] focus:ring-4 focus:ring-[#24d8d0]/20"
            />
            <button
              type="button"
              onClick={handleJoin}
              disabled={!joinName.trim()}
              data-testid="button-join-room"
              className="flex w-full items-center justify-center gap-2 rounded-[8px] border-[3px] border-[#20100d] bg-[#9f1714] px-5 py-4 text-lg font-bold text-[#fff8df] shadow-[5px_5px_0_#20100d] transition hover:bg-[#24d8d0] hover:text-[#20100d] focus:outline-none focus:ring-4 focus:ring-[#24d8d0]/30 disabled:cursor-not-allowed disabled:opacity-55"
            >
              Enter booth
              <DoorOpen size={20} aria-hidden="true" />
            </button>
          </motion.div>
        </section>
      </main>
    );
  }

  const isBooth = store.status === "countdown" || store.status === "capturing";
  const totalSlots = store.groupSize || fetchedGroupSize;
  const currentShot = (store.currentShotIndex ?? 0) + 1;

  return (
    <main className="arcade-route min-h-[100dvh] bg-[#2c0707] text-[#fff4d1]">
      <div className="film-grain" />
      <canvas ref={canvasRef} className="hidden" />

      <header className="relative z-20 flex flex-col gap-3 border-b border-[#ffcc3d]/25 bg-[#160303]/88 px-5 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between md:px-8">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase text-[#ffcc3d]">SnapBooth room</p>
          <h1 className="truncate font-serif text-2xl leading-none text-[#ffefb0] [letter-spacing:0] sm:text-3xl">
            {store.roomId || roomId}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {isBooth && (
            <span className="hidden rounded-[999px] border border-[#ffcc3d]/50 px-3 py-1 text-sm font-bold text-[#ffcc3d] sm:inline-flex">
              Shot {currentShot} of {BOOTH_FRAME_COUNT}
            </span>
          )}
          <button
            type="button"
            onClick={handleLeave}
            data-testid="button-leave-room"
            className="rounded-[8px] border border-[#fff4d1]/25 p-2 text-[#fff4d1] transition hover:border-[#24d8d0] hover:text-[#24d8d0] focus:outline-none focus:ring-4 focus:ring-[#24d8d0]/30"
            aria-label="Leave room"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
      </header>

      {!isBooth ? (
        <section className="mx-auto grid min-h-[calc(100dvh-82px)] w-full min-w-0 max-w-7xl gap-4 px-4 py-4 sm:gap-6 sm:px-5 sm:py-6 lg:grid-cols-[390px_1fr] lg:px-8">
          <aside className="min-w-0 rounded-[8px] border-[3px] border-[#20100d] bg-[#fff8df] p-5 text-[#20100d] shadow-[8px_8px_0_#20100d]">
            <div className="mb-6 border-b-[3px] border-[#20100d] pb-5">
              <p className="text-sm font-bold uppercase text-[#9f1714]">Invite ticket</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <div className="min-w-0 flex-1 rounded-[8px] border-2 border-[#20100d] bg-white px-3 py-2 font-mono text-sm text-[#5f3427]">
                  <span className="block truncate">{window.location.origin}/room/{roomId}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  data-testid="button-copy-link"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[8px] border-2 border-[#20100d] bg-[#ffcc3d] px-3 py-2 text-sm font-bold shadow-[3px_3px_0_#20100d] transition hover:bg-[#24d8d0] focus:outline-none focus:ring-4 focus:ring-[#24d8d0]/30 sm:w-auto"
                >
                  {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            <div>
              <p className="mb-3 text-sm font-bold uppercase text-[#9f1714]">
                Players {store.participants.length}/{totalSlots}
              </p>
              <div className="grid gap-3">
                {Array.from({ length: totalSlots }).map((_, index) => {
                  const participant = store.participants[index];
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.04 }}
                      data-testid={`participant-slot-${index}`}
                      className={`flex min-h-16 items-center gap-3 rounded-[8px] border-2 px-3 py-3 ${
                        participant
                          ? "border-[#20100d] bg-[#ffefb0]"
                          : "border-dashed border-[#9b8172] bg-[#f1dfb8]"
                      }`}
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] border-2 border-[#20100d] bg-[#24d8d0] font-bold">
                        {participant ? participant.name.charAt(0).toUpperCase() : <Users size={17} aria-hidden="true" />}
                      </span>
                      {participant ? (
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold">{participant.name}</p>
                          <p className="text-xs font-bold uppercase text-[#9f1714]">
                            {participant.isHost ? "Host" : "Guest"}
                            {participant.id === store.myParticipantId ? " / You" : ""}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm font-bold text-[#7c5d4c]">Waiting for player</p>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6">
              {store.isHost ? (
                <button
                  type="button"
                  onClick={sendStart}
                  disabled={store.participants.length < 2}
                  data-testid="button-start-session"
                  className="flex w-full items-center justify-center gap-2 rounded-[8px] border-[3px] border-[#20100d] bg-[#9f1714] px-5 py-4 text-lg font-bold text-[#fff8df] shadow-[5px_5px_0_#20100d] transition hover:bg-[#24d8d0] hover:text-[#20100d] focus:outline-none focus:ring-4 focus:ring-[#24d8d0]/30 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {store.participants.length < 2 ? "Waiting for guests" : "Start session"}
                  <Play size={20} aria-hidden="true" />
                </button>
              ) : (
                <p className="rounded-[8px] border-2 border-[#20100d] bg-[#f1dfb8] px-4 py-4 text-center font-bold text-[#5f3427]">
                  Waiting for host to start
                </p>
              )}
            </div>
          </aside>

          <section className="flex min-h-[320px] min-w-0 flex-col justify-center gap-4 sm:min-h-[420px]">
            <p className="text-sm font-bold uppercase text-[#ffcc3d]">Live preview</p>
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[8px] border-[4px] border-[#20100d] bg-black shadow-[7px_7px_0_#ffcc3d] sm:border-[6px] sm:shadow-[10px_10px_0_#ffcc3d]">
              {hasPermission === null && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#160303]">
                  <p className="font-serif text-2xl text-[#ffcc3d] [letter-spacing:0]">Connecting camera</p>
                </div>
              )}
              {hasPermission === false && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#160303] p-6 text-center">
                  <Camera size={48} className="mb-3 text-[#ffcc3d]" aria-hidden="true" />
                  <p className="font-bold text-white">Camera access denied</p>
                  <p className="mt-1 max-w-sm text-sm text-white/70">Allow camera access in your browser settings.</p>
                </div>
              )}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                data-testid="video-lobby-preview"
                className="h-full w-full scale-x-[-1] object-cover"
              />
              {store.myName && (
                <div className="absolute bottom-4 left-4 rounded-[8px] border-2 border-white/25 bg-black/55 px-3 py-2 text-sm font-bold text-white backdrop-blur">
                  {store.myName}
                </div>
              )}
            </div>
          </section>
        </section>
      ) : (
        <section className="relative flex min-h-[calc(100dvh-82px)] flex-col items-center justify-center bg-[#070202] px-4 py-6">
          <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center gap-5">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[8px] border-[5px] border-[#9f1714] bg-black shadow-[0_0_0_3px_#20100d,0_20px_46px_rgba(255,204,61,0.18)] sm:border-[8px] sm:shadow-[0_0_0_4px_#20100d,0_28px_70px_rgba(255,204,61,0.22)]">
              {hasPermission === false && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#160303] p-8 text-center">
                  <Camera size={64} className="mb-4 text-[#ffcc3d]" aria-hidden="true" />
                  <p className="text-xl font-bold text-white">Camera access denied</p>
                  <p className="mt-2 text-white/70">Allow camera access to participate.</p>
                </div>
              )}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                data-testid="video-booth"
                className="h-full w-full scale-x-[-1] object-cover"
              />

              <AnimatePresence>
                {flash && (
                  <motion.div
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.45 }}
                    className="absolute inset-0 z-40 bg-white"
                  />
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                {countdownDisplay !== null && countdownDisplay > 0 && (
                  <motion.div
                    key={countdownDisplay}
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.8, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 22 }}
                    className="absolute inset-0 z-30 flex items-center justify-center"
                  >
                    <span className="font-serif text-[5rem] font-bold text-white drop-shadow-[0_0_50px_rgba(0,0,0,0.95)] [letter-spacing:0] sm:text-[8rem] md:text-[13rem]">
                      {countdownDisplay}
                    </span>
                  </motion.div>
                )}
                {countdownDisplay === 0 && (
                  <motion.div
                    key="smile"
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.3, opacity: 0 }}
                    className="absolute inset-0 z-30 flex items-center justify-center"
                  >
                    <span className="font-serif text-4xl font-bold text-white drop-shadow-[0_0_50px_rgba(0,0,0,0.95)] [letter-spacing:0] sm:text-6xl md:text-9xl">
                      SMILE!
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {celebrationPhotos && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 bg-black/78 p-5"
                  >
                    <p className="font-serif text-4xl text-[#ffcc3d] [letter-spacing:0]">Nice shot</p>
                    <div className="flex flex-wrap justify-center gap-4">
                      {celebrationPhotos.map((photo) => (
                        <motion.div
                          key={photo.participantId}
                          initial={{ scale: 0, rotate: -10 }}
                          animate={{ scale: 1, rotate: 0 }}
                          className="flex flex-col items-center gap-2"
                        >
                          <div className="h-32 w-24 overflow-hidden rounded-[8px] border-[3px] border-[#fff8df] shadow-xl md:h-36 md:w-28">
                            <img src={photo.data} alt={photo.name} className="h-full w-full object-cover" />
                          </div>
                          <span className="text-sm font-bold text-white/85">{photo.name}</span>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              {Array.from({ length: BOOTH_FRAME_COUNT }).map((_, index) => {
                const shot = store.shots.find((item) => item.shotIndex === index);
                const myPhoto = shot?.photos.find((photo) => photo.participantId === store.myParticipantId);
                return (
                  <div
                    key={index}
                    className="h-20 w-16 overflow-hidden rounded-[8px] border-2 border-[#ffefb0]/25 bg-black/50 md:h-28 md:w-20"
                  >
                    {myPhoto ? (
                      <motion.img
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        src={myPhoto.data}
                        alt={`Shot ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs font-bold text-white/25">
                        {index + 1}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
