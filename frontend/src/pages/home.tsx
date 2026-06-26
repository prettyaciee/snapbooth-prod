import { useState, type CSSProperties } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Camera,
  PartyPopper,
  Sparkles,
  Ticket,
  User,
  Users,
  X,
} from "lucide-react";
import { usePhotoStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { buildApiUrl } from "@/lib/api";

export const MODES = [
  { id: "Duo", label: "Duo", count: 2, icon: User },
  { id: "Trio", label: "Trio", count: 3, icon: Users },
  { id: "Quadro", label: "Quadro", count: 4, icon: Users },
  { id: "Cinco", label: "Cinco", count: 5, icon: PartyPopper },
  { id: "Six", label: "Six", count: 6, icon: PartyPopper },
] as const;

export const PHOTO_STRIP_SAMPLES = [
  {
    caption: "11:42 PM",
    accent: "#24d8d0",
    className: "photo-strip--left",
    frames: ["rose", "teal", "gold", "ink"],
  },
  {
    caption: "HIGH SCORE",
    accent: "#ffcc3d",
    className: "photo-strip--center",
    frames: ["gold", "ink", "rose", "teal"],
  },
  {
    caption: "LAST ROUND",
    accent: "#ff6b83",
    className: "photo-strip--right",
    frames: ["teal", "rose", "ink", "gold"],
  },
] as const;

type ModeOption = (typeof MODES)[number];
type StripStyle = CSSProperties & { "--strip-accent": string };

export default function Home() {
  const [, setLocation] = useLocation();
  const { setRoomInfo, clear } = usePhotoStore();
  const { toast } = useToast();

  const [selectedMode, setSelectedMode] = useState<ModeOption | null>(null);
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleSelectMode = (mode: ModeOption) => {
    setSelectedMode(mode);
  };

  const handleCreateRoom = async () => {
    if (!name.trim() || !selectedMode) return;

    setIsCreating(true);
    try {
      const res = await fetch(buildApiUrl("/rooms"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupSize: selectedMode.count }),
      });

      if (!res.ok) throw new Error("Failed to create room");
      const data = await res.json();

      const myParticipantId = crypto.randomUUID();

      clear();
      setRoomInfo({
        roomId: data.roomId,
        hostId: data.hostId,
        myParticipantId,
        myName: name.trim(),
        isHost: true,
        groupSize: selectedMode.count,
        mode: selectedMode.id,
      });

      setLocation(`/room/${data.roomId}`);
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Could not create the room. Please try again.",
        variant: "destructive",
      });
      setIsCreating(false);
    }
  };

  return (
    <main className="snapbooth-landing min-h-[100dvh] overflow-hidden bg-[#2c0707] text-[#fff4d1]">
      <div className="film-grain" />

      <section className="arcade-hero relative isolate min-h-[72dvh] px-5 py-5 md:min-h-[76dvh] md:px-10 md:py-8">
        <div className="arcade-scanlines" />

        <nav className="relative z-20 mx-auto flex w-full max-w-[calc(100vw-2.5rem)] items-center justify-between md:max-w-7xl">
          <a
            href="#top"
            className="flex items-center gap-2 text-sm font-bold text-[#fff4d1]"
            aria-label="SnapBooth home"
          >
            <Camera size={18} aria-hidden="true" />
            <span>SnapBooth</span>
          </a>
          <a
            href="#start"
            className="hidden items-center gap-2 rounded-[999px] border border-[#ffcc3d]/60 bg-[#1a0505]/70 px-4 py-2 text-sm font-bold text-[#fff4d1] shadow-[0_0_22px_rgba(255,204,61,0.18)] transition hover:border-[#24d8d0] hover:text-[#24d8d0] focus:outline-none focus:ring-4 focus:ring-[#24d8d0]/30 sm:inline-flex"
          >
            <Ticket size={16} aria-hidden="true" />
            Start
          </a>
        </nav>

        <div className="relative z-10 mx-auto grid w-full min-w-0 max-w-[calc(100vw-2.5rem)] items-center gap-5 py-6 md:max-w-7xl md:grid-cols-[0.92fr_1.08fr] md:gap-10 md:py-12 lg:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="min-w-0 max-w-2xl"
          >
            <div className="mb-5 inline-flex items-center gap-2 border-y border-[#ffcc3d]/50 py-2 text-sm font-bold text-[#ffcc3d]">
              <Sparkles size={16} aria-hidden="true" />
              Arcade photo strips
            </div>
            <h1 className="max-w-full font-serif text-4xl leading-none text-[#ffefb0] [letter-spacing:0] sm:text-6xl md:text-8xl">
              SnapBooth
            </h1>
            <p className="mt-5 max-w-[21rem] text-base font-medium leading-7 text-[#ffe8a8] md:mt-6 md:max-w-xl md:text-xl md:leading-8">
              Drop into the booth, stack four frames, and leave with a strip
              that feels pulled from a late-night arcade cabinet.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#start"
                className="inline-flex items-center gap-2 rounded-[8px] border-2 border-[#15100c] bg-[#ffcc3d] px-5 py-3 font-bold text-[#211108] shadow-[5px_5px_0_#15100c] transition hover:-translate-y-0.5 hover:bg-[#24d8d0] focus:outline-none focus:ring-4 focus:ring-[#24d8d0]/30"
              >
                Pick a booth
                <ArrowRight size={18} aria-hidden="true" />
              </a>
              <span className="inline-flex items-center rounded-[8px] border-2 border-[#ffefb0]/35 px-5 py-3 text-sm font-bold text-[#ffefb0]">
                4 frames per strip
              </span>
            </div>
          </motion.div>

          <div className="photo-strip-stage" aria-label="Sample finished photo strips">
            {PHOTO_STRIP_SAMPLES.map((strip, stripIndex) => (
              <motion.article
                key={strip.caption}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{
                  delay: 0.16 + stripIndex * 0.12,
                  duration: 0.6,
                  ease: "easeOut",
                }}
                className={`photo-strip ${strip.className}`}
                style={{ "--strip-accent": strip.accent } as StripStyle}
              >
                <div className="photo-strip__perforation" aria-hidden="true" />
                <div className="photo-strip__frames">
                  {strip.frames.map((frame, frameIndex) => (
                    <div
                      key={`${strip.caption}-${frameIndex}`}
                      className={`photo-strip__frame photo-strip__frame--${frame}`}
                    >
                      <span>{String(frameIndex + 1).padStart(2, "0")}</span>
                      <i aria-hidden="true" />
                    </div>
                  ))}
                </div>
                <footer>{strip.caption}</footer>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section id="start" className="relative z-10 bg-[#f7edcf] px-5 py-8 text-[#20100d] md:px-10 md:py-16">
        <div className="mx-auto w-full max-w-[calc(100vw-2.5rem)] md:max-w-7xl">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-2 text-sm font-bold uppercase text-[#9f1714]">
                Step into the booth
              </p>
              <h2 className="font-serif text-3xl leading-none text-[#20100d] [letter-spacing:0] md:text-5xl">
                Choose your strip size
              </h2>
            </div>
            <p className="max-w-md text-base font-medium leading-7 text-[#5f3427]">
              Pick a group size, add your name, then host from the next screen.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {MODES.map((mode, index) => (
              <motion.button
                key={mode.id}
                type="button"
                onClick={() => handleSelectMode(mode)}
                data-testid={`button-mode-${mode.id.toLowerCase()}`}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: index * 0.06, duration: 0.35 }}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.98 }}
                className="arcade-mode-button group rounded-[8px] border-[3px] border-[#20100d] bg-[#fff8df] p-5 text-left shadow-[6px_6px_0_#20100d] transition focus:outline-none focus:ring-4 focus:ring-[#24d8d0]/35"
              >
                <span className="mb-7 flex h-12 w-12 items-center justify-center rounded-[8px] border-2 border-[#20100d] bg-[#ffcc3d] text-[#20100d] transition group-hover:bg-[#24d8d0]">
                  <mode.icon size={24} aria-hidden="true" />
                </span>
                <span className="block font-serif text-3xl leading-none text-[#20100d] [letter-spacing:0]">
                  {mode.label}
                </span>
                <span className="mt-3 flex items-center justify-between text-sm font-bold text-[#8d1d18]">
                  {mode.count} people
                  <ArrowRight size={18} aria-hidden="true" />
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      <AnimatePresence>
        {selectedMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-[#1b0504]/85 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.94, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 20 }}
              className="relative w-full max-w-md rounded-[8px] border-[3px] border-[#20100d] bg-[#fff8df] p-7 text-[#20100d] shadow-[8px_8px_0_#ffcc3d]"
            >
              <button
                type="button"
                onClick={() => setSelectedMode(null)}
                className="absolute right-4 top-4 rounded-[8px] p-2 text-[#5f3427] transition hover:bg-[#ead8af] hover:text-[#20100d] focus:outline-none focus:ring-4 focus:ring-[#24d8d0]/30"
                aria-label="Close"
              >
                <X size={20} aria-hidden="true" />
              </button>

              <div className="mb-6 pr-10">
                <p className="mb-2 text-sm font-bold uppercase text-[#9f1714]">
                  {selectedMode.label} session
                </p>
                <h2 className="font-serif text-4xl leading-none text-[#20100d] [letter-spacing:0]">
                  Host name
                </h2>
              </div>

              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="mb-6 w-full rounded-[8px] border-[3px] border-[#20100d] bg-white px-4 py-3 text-lg font-bold text-[#20100d] outline-none transition placeholder:text-[#9b8172] focus:border-[#24d8d0] focus:ring-4 focus:ring-[#24d8d0]/20"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleCreateRoom()}
                data-testid="input-host-name"
              />

              <button
                type="button"
                onClick={handleCreateRoom}
                disabled={!name.trim() || isCreating}
                data-testid="button-create-room"
                className="flex w-full items-center justify-center gap-2 rounded-[8px] border-[3px] border-[#20100d] bg-[#9f1714] px-5 py-4 text-lg font-bold text-[#fff8df] shadow-[5px_5px_0_#20100d] transition hover:bg-[#24d8d0] hover:text-[#20100d] focus:outline-none focus:ring-4 focus:ring-[#24d8d0]/30 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {isCreating ? "Creating room" : "Create room"}
                {!isCreating && <ArrowRight size={20} aria-hidden="true" />}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
