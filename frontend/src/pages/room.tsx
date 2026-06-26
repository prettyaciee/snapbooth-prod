import { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { usePhotoStore } from "@/lib/store";
import { useRoomWs } from "@/hooks/use-room-ws";
import { Camera, X, Copy, Check, Users } from "lucide-react";
import { buildApiUrl } from "@/lib/api";

type Phase = "fetching" | "name_entry" | "ready";

const GROUP_SIZE_TO_MODE: Record<number, string> = {
  2: "Duo", 3: "Trio", 4: "Quadro", 5: "Cinco", 6: "Six",
};

export default function Room() {
  const { roomId } = useParams<{ roomId: string }>();
  const [, setLocation] = useLocation();
  const store = usePhotoStore();

  // Phase management — local state so no store dependency loop
  const initialPhase: Phase = store.myName && store.roomId ? "ready" : "fetching";
  const [phase, setPhase] = useState<Phase>(initialPhase);
  const [fetchedGroupSize, setFetchedGroupSize] = useState(store.groupSize ?? 0);
  const [joinName, setJoinName] = useState("");
  const [fetchError, setFetchError] = useState(false);

  // Stable participant ID — created once per mount for guest
  const myParticipantId = useRef(store.myParticipantId || crypto.randomUUID()).current;

  // Camera
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // Booth UI
  const [flash, setFlash] = useState(false);
  const [countdownDisplay, setCountdownDisplay] = useState<number | null>(null);
  const [celebrationPhotos, setCelebrationPhotos] = useState<{ participantId: string; name: string; data: string }[] | null>(null);

  // Share
  const [copied, setCopied] = useState(false);

  // ── Step 1: fetch room info for guests ──────────────────────────────────────
  useEffect(() => {
    if (phase !== "fetching") return;
    if (!roomId) { setLocation("/"); return; }

    fetch(buildApiUrl(`/rooms/${roomId}`))
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json() as Promise<{ roomId: string; groupSize: number; status: string }>;
      })
      .then((data) => {
        setFetchedGroupSize(data.groupSize);
        setPhase("name_entry");
      })
      .catch(() => {
        setFetchError(true);
        setTimeout(() => setLocation("/"), 2000);
      });
  }, [phase, roomId, setLocation]);

  // ── Step 2: guest submits name ───────────────────────────────────────────────
  const handleJoin = () => {
    if (!joinName.trim() || !roomId) return;
    store.setRoomInfo({
      roomId,
      hostId: "",
      myParticipantId,
      myName: joinName.trim(),
      isHost: false,
      groupSize: fetchedGroupSize,
      mode: GROUP_SIZE_TO_MODE[fetchedGroupSize] ?? "Group",
    });
    setPhase("ready");
  };

  // ── Camera setup ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "ready") return;
    let active = true;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } } })
      .then((s) => {
        if (!active) { s.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = s;
        if (videoRef.current) videoRef.current.srcObject = s;
        setHasPermission(true);
      })
      .catch(() => { if (active) setHasPermission(false); });
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [phase]);

  // ── Capture listener ─────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const { shotIndex } = (e as CustomEvent<{ shotIndex: number }>).detail;
      if (!videoRef.current || !canvasRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      sendPhoto(dataUrl, shotIndex);
      setCountdownDisplay(null);
      setFlash(true);
      setTimeout(() => setFlash(false), 200);
    };
    window.addEventListener("snapbooth-capture", handler);
    return () => window.removeEventListener("snapbooth-capture", handler);
  }, []);

  // ── Countdown listener ───────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const { count } = (e as CustomEvent<{ count: number }>).detail;
      setCountdownDisplay(count);
      setCelebrationPhotos(null);
    };
    window.addEventListener("snapbooth-countdown-ui", handler);
    return () => window.removeEventListener("snapbooth-countdown-ui", handler);
  }, []);

  // ── Watch celebration (shot_complete) ────────────────────────────────────────
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

  // ── Navigate to result when done ─────────────────────────────────────────────
  useEffect(() => {
    if (store.status === "done") {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      setTimeout(() => setLocation("/result"), 600);
    }
  }, [store.status, setLocation]);

  const { sendStart, sendPhoto } = useRoomWs();

  const handleCopy = () => {
    navigator.clipboard.writeText(`${window.location.origin}/room/${roomId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeave = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    store.clear();
    setLocation("/");
  };

  // ════════════════════════════════════════════════════════════════════════════
  // Phase: fetching
  // ════════════════════════════════════════════════════════════════════════════
  if (phase === "fetching") {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center gap-4">
        <div className="film-grain" />
        {fetchError ? (
          <p className="font-serif text-2xl text-destructive">Room not found. Redirecting...</p>
        ) : (
          <p className="font-serif text-3xl text-secondary animate-pulse">Finding room...</p>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Phase: name entry (guest)
  // ════════════════════════════════════════════════════════════════════════════
  if (phase === "name_entry") {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center p-6 relative">
        <div className="film-grain" />
        <div className="absolute top-0 left-0 w-64 h-full bg-secondary/20 blur-[100px] pointer-events-none" />
        <div className="absolute top-0 right-0 w-64 h-full bg-secondary/20 blur-[100px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border-2 border-border rounded-3xl p-10 max-w-md w-full shadow-2xl z-10"
        >
          <h1 className="font-serif text-5xl text-secondary mb-2">SnapBooth</h1>
          <p className="text-muted-foreground mb-1">You've been invited to a</p>
          <p className="font-bold text-foreground text-xl mb-8">
            {GROUP_SIZE_TO_MODE[fetchedGroupSize] ?? "Group"} session
          </p>

          <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Your Name
          </label>
          <input
            type="text"
            value={joinName}
            onChange={(e) => setJoinName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            placeholder="Enter your name"
            autoFocus
            data-testid="input-guest-name"
            className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl text-lg mb-6 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all"
          />

          <button
            onClick={handleJoin}
            disabled={!joinName.trim()}
            data-testid="button-join-room"
            className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-bold text-lg hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Join Session
          </button>
        </motion.div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Phase: ready (lobby + booth)
  // ════════════════════════════════════════════════════════════════════════════
  const isBooth = store.status === "countdown" || store.status === "capturing";
  const totalSlots = store.groupSize || fetchedGroupSize;

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col relative overflow-hidden">
      <div className="film-grain" />
      <canvas ref={canvasRef} className="hidden" />

      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-center px-6 py-4 border-b border-border z-10 bg-background/80 backdrop-blur-sm">
        <h1 className="font-serif text-3xl text-secondary">SnapBooth</h1>
        <div className="flex items-center gap-3">
          {isBooth && (
            <span className="font-mono text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
              Shot {(store.currentShotIndex ?? 0) + 1} of 4
            </span>
          )}
          <button
            onClick={handleLeave}
            data-testid="button-leave-room"
            className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      {!isBooth ? (
        // ── LOBBY ────────────────────────────────────────────────────────────
        <div className="flex flex-col lg:flex-row flex-1 min-h-0">
          {/* Left: room info + participants */}
          <div className="w-full lg:w-[420px] flex-shrink-0 border-b lg:border-b-0 lg:border-r border-border bg-card/30 p-6 lg:p-8 flex flex-col gap-6 overflow-y-auto">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Room Code</p>
              <h2 className="font-serif text-4xl text-secondary font-bold tracking-wider">{store.roomId || roomId}</h2>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Invite Link</p>
              <div className="flex gap-2">
                <div className="flex-1 bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-muted-foreground truncate font-mono">
                  {window.location.origin}/room/{roomId}
                </div>
                <button
                  onClick={handleCopy}
                  data-testid="button-copy-link"
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors shrink-0"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
                Participants ({store.participants.length} / {totalSlots})
              </p>
              <div className="flex flex-col gap-2">
                {Array.from({ length: totalSlots }).map((_, i) => {
                  const p = store.participants[i];
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      data-testid={`participant-slot-${i}`}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-colors ${
                        p ? "border-primary/30 bg-primary/5" : "border-dashed border-border/60 bg-muted/20"
                      }`}
                    >
                      {p ? (
                        <>
                          <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center text-sm shrink-0">
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-foreground truncate">{p.name}</p>
                            {p.isHost && <p className="text-xs text-muted-foreground">Host</p>}
                          </div>
                          {p.id === store.myParticipantId && (
                            <span className="text-xs text-primary font-bold uppercase tracking-wider shrink-0">You</span>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="w-9 h-9 rounded-full border-2 border-dashed border-border flex items-center justify-center shrink-0">
                            <Users size={15} className="text-muted-foreground" />
                          </div>
                          <p className="text-muted-foreground text-sm animate-pulse">Waiting...</p>
                        </>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <div>
              {store.isHost ? (
                <button
                  onClick={sendStart}
                  disabled={store.participants.length < 2}
                  data-testid="button-start-session"
                  className="w-full py-4 bg-secondary text-secondary-foreground rounded-xl font-bold text-lg hover:bg-secondary/90 transition-colors shadow-lg shadow-secondary/20 disabled:opacity-40 disabled:cursor-not-allowed uppercase tracking-wider"
                >
                  {store.participants.length < 2
                    ? `Waiting for guests... (${store.participants.length}/${totalSlots})`
                    : "Start Session"}
                </button>
              ) : (
                <p className="text-center py-4 text-muted-foreground font-medium animate-pulse">
                  Waiting for host to start...
                </p>
              )}
            </div>
          </div>

          {/* Right: camera preview */}
          <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-10 gap-4 min-h-0">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Your Camera Preview</p>

            <div className="relative w-full max-w-xl aspect-[4/3] bg-black rounded-2xl overflow-hidden border-4 border-border shadow-xl">
              {hasPermission === null && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                  <p className="font-serif text-xl text-primary animate-pulse">Connecting camera...</p>
                </div>
              )}
              {hasPermission === false && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 p-6 text-center">
                  <Camera size={48} className="text-zinc-600 mb-3" />
                  <p className="text-white font-bold mb-1">Camera Access Denied</p>
                  <p className="text-zinc-400 text-sm">Allow camera access in your browser settings.</p>
                </div>
              )}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                data-testid="video-lobby-preview"
                className="w-full h-full object-cover scale-x-[-1]"
              />
              {store.myName && (
                <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">
                  <p className="text-white text-sm font-medium">{store.myName}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        // ── BOOTH ────────────────────────────────────────────────────────────
        <div className="flex-1 flex flex-col items-center justify-center p-4 bg-zinc-950 relative">
          <div className="relative w-full max-w-4xl mx-auto flex flex-col items-center gap-6">
            {/* Viewfinder */}
            <div className="relative w-full aspect-[4/3] bg-black rounded-3xl overflow-hidden border-8 border-secondary shadow-2xl shadow-secondary/30">
              {hasPermission === false && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 text-center p-8">
                  <Camera size={64} className="text-zinc-600 mb-4" />
                  <p className="text-white font-bold text-xl mb-2">Camera Access Denied</p>
                  <p className="text-zinc-400">Please allow camera access to participate.</p>
                </div>
              )}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                data-testid="video-booth"
                className="w-full h-full object-cover scale-x-[-1]"
              />

              {/* Flash */}
              <AnimatePresence>
                {flash && (
                  <motion.div
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.45 }}
                    className="absolute inset-0 bg-white z-40 pointer-events-none"
                  />
                )}
              </AnimatePresence>

              {/* Countdown */}
              <AnimatePresence mode="wait">
                {countdownDisplay !== null && countdownDisplay > 0 && (
                  <motion.div
                    key={countdownDisplay}
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.8, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 22 }}
                    className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none"
                  >
                    <span className="font-serif text-[160px] md:text-[220px] font-bold text-white drop-shadow-[0_0_50px_rgba(0,0,0,0.95)]">
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
                    className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none"
                  >
                    <span className="font-serif text-[100px] md:text-[160px] font-bold text-white drop-shadow-[0_0_50px_rgba(0,0,0,0.95)]">
                      SMILE!
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Celebration overlay */}
              <AnimatePresence>
                {celebrationPhotos && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/75 z-20 flex flex-col items-center justify-center gap-6 p-6"
                  >
                    <p className="font-serif text-3xl text-primary">Nice shot!</p>
                    <div className="flex flex-wrap justify-center gap-4">
                      {celebrationPhotos.map((ph) => (
                        <motion.div
                          key={ph.participantId}
                          initial={{ scale: 0, rotate: -10 }}
                          animate={{ scale: 1, rotate: 0 }}
                          className="flex flex-col items-center gap-2"
                        >
                          <div className="w-24 h-32 md:w-28 md:h-36 rounded-xl border-4 border-white/20 overflow-hidden shadow-xl">
                            <img src={ph.data} alt={ph.name} className="w-full h-full object-cover" />
                          </div>
                          <span className="text-white/80 text-sm font-medium">{ph.name}</span>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Thumbnails — my photos */}
            <div className="flex gap-3 justify-center">
              {[0, 1, 2, 3].map((i) => {
                const shot = store.shots.find((s) => s.shotIndex === i);
                const myPhoto = shot?.photos.find((p) => p.participantId === store.myParticipantId);
                return (
                  <div
                    key={i}
                    className="w-16 h-20 md:w-20 md:h-28 rounded-lg border-2 border-white/20 bg-black/50 overflow-hidden"
                  >
                    {myPhoto && (
                      <motion.img
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        src={myPhoto.data}
                        alt={`Shot ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
