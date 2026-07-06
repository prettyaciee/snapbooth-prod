import { motion } from "framer-motion";
import { ArrowLeft, Camera, HelpCircle } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <main className="snapbooth-landing min-h-[100dvh] overflow-hidden bg-[#2c0707] text-[#fff4d1] flex flex-col">
      <div className="film-grain" />
      <div className="arcade-scanlines" />

      <nav className="relative z-20 mx-auto flex w-full max-w-[calc(100vw-2.5rem)] items-center justify-between py-5 md:max-w-7xl md:py-8">
        <button
          type="button"
          onClick={() => setLocation("/")}
          className="flex items-center gap-2 text-sm font-bold text-[#fff4d1] transition-colors hover:text-[#24d8d0]"
        >
          <Camera size={18} aria-hidden="true" />
          <span>SnapBooth</span>
        </button>
      </nav>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mx-auto flex max-w-xl flex-col items-center"
        >
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-[12px] border-[4px] border-[#20100d] bg-[#ffcc3d] text-[#20100d] shadow-[8px_8px_0_#15100c]">
            <HelpCircle size={48} strokeWidth={2.5} aria-hidden="true" />
          </div>

          <h1 className="mb-4 font-serif text-6xl leading-none text-[#ffefb0] md:text-8xl [letter-spacing:0]">
            404
          </h1>

          <p className="mb-8 max-w-md text-lg font-medium text-[#ffe8a8] md:text-xl">
            Looks like this photo strip got stuck in the machine. The page you're looking for doesn't exist.
          </p>

          <button
            type="button"
            onClick={() => setLocation("/")}
            className="inline-flex items-center gap-2 rounded-[8px] border-[3px] border-[#15100c] bg-[#24d8d0] px-6 py-4 text-lg font-bold text-[#15100c] shadow-[6px_6px_0_#15100c] transition hover:-translate-y-1 hover:shadow-[6px_8px_0_#15100c] focus:outline-none focus:ring-4 focus:ring-[#24d8d0]/30 active:translate-y-0 active:shadow-[2px_2px_0_#15100c]"
          >
            <ArrowLeft size={20} aria-hidden="true" />
            Back to Arcade
          </button>
        </motion.div>
      </div>
    </main>
  );
}
