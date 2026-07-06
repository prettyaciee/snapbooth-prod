import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Download, RefreshCcw, Sparkles } from "lucide-react";
import { usePhotoStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { ARCADE_FILTERS, BOOTH_FRAME_COUNT } from "@/lib/arcade-ui";
import { getResultStripLayout } from "@/lib/result-strip-layout";
import { createStripDownloadAsset } from "@/lib/strip-download";

type DownloadAsset = {
  blob: Blob;
  filename: string;
  url: string;
};

export default function Result() {
  const [, setLocation] = useLocation();
  const store = usePhotoStore();
  const { shots, participants, mode, filter, setFilter, clear } = store;
  const stripRef = useRef<HTMLDivElement>(null);
  const downloadUrlRef = useRef<string | null>(null);
  const [downloadAsset, setDownloadAsset] = useState<DownloadAsset | null>(null);
  const [isPreparingDownload, setIsPreparingDownload] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!shots || shots.length === 0) {
      setLocation("/");
    }
  }, [shots, setLocation]);

  useEffect(() => {
    if (!shots || shots.length === 0) {
      if (downloadUrlRef.current) {
        URL.revokeObjectURL(downloadUrlRef.current);
        downloadUrlRef.current = null;
      }
      setDownloadAsset(null);
      setIsPreparingDownload(false);
      return;
    }

    let active = true;
    setIsPreparingDownload(true);

    void createStripDownloadAsset({ shots, participants, mode, filter })
      .then((asset) => {
        if (!active) return;

        const url = URL.createObjectURL(asset.blob);
        if (downloadUrlRef.current) {
          URL.revokeObjectURL(downloadUrlRef.current);
        }
        downloadUrlRef.current = url;
        setDownloadAsset({ ...asset, url });
      })
      .catch((error) => {
        console.error(error);
        if (!active) return;

        if (downloadUrlRef.current) {
          URL.revokeObjectURL(downloadUrlRef.current);
          downloadUrlRef.current = null;
        }
        setDownloadAsset(null);
        toast({
          title: "Download unavailable",
          description: "We couldn't prepare the strip file. Refresh the page and try again.",
          variant: "destructive",
        });
      })
      .finally(() => {
        if (active) {
          setIsPreparingDownload(false);
        }
      });

    return () => {
      active = false;
    };
  }, [filter, mode, participants, shots, toast]);

  useEffect(() => {
    return () => {
      if (downloadUrlRef.current) {
        URL.revokeObjectURL(downloadUrlRef.current);
        downloadUrlRef.current = null;
      }
    };
  }, []);

  const handleRetake = () => {
    clear();
    setLocation("/");
  };

  const handleDownload = async () => {
    if (!downloadAsset) {
      toast({
        title: "Still preparing",
        description: "The strip file is still being prepared. Try again in a moment.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (
        typeof navigator !== "undefined" &&
        "share" in navigator &&
        "canShare" in navigator
      ) {
        const file = new File([downloadAsset.blob], downloadAsset.filename, {
          type: downloadAsset.blob.type || "image/png",
        });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: downloadAsset.filename,
          });
          return;
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      console.error(error);
    }

    const link = document.createElement("a");
    link.download = downloadAsset.filename;
    link.href = downloadAsset.url;
    link.rel = "noopener";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  if (!shots || shots.length === 0) return null;

  const currentFilterCss = ARCADE_FILTERS.find((item) => item.id === filter)?.css || "none";
  const orderedParticipants = [...participants].sort((a, b) => a.id.localeCompare(b.id));
  const stripLayout = getResultStripLayout(orderedParticipants.length);

  return (
    <main className="arcade-route min-h-[100dvh] bg-[#2c0707] text-[#fff4d1]">
      <div className="film-grain" />

      <div className="mx-auto grid min-h-[100dvh] w-full min-w-0 max-w-7xl gap-4 px-4 py-4 sm:gap-6 sm:px-5 sm:py-6 lg:grid-cols-[360px_1fr] lg:px-8">
        <aside className="flex min-w-0 flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[8px] border-[3px] border-[#20100d] bg-[#fff8df] p-5 text-[#20100d] shadow-[8px_8px_0_#ffcc3d]"
          >
            <p className="mb-2 flex items-center gap-2 text-sm font-bold uppercase text-[#9f1714]">
              <Sparkles size={16} aria-hidden="true" />
              Prize counter
            </p>
            <h1 className="font-serif text-4xl leading-none [letter-spacing:0]">The Strip</h1>
            <p className="mt-4 font-medium leading-7 text-[#5f3427]">
              Tune the final print, then download the arcade booth sheet.
            </p>

            <div className="my-6 h-[3px] bg-[#20100d]" />

            <section>
              <h2 className="mb-3 text-sm font-bold uppercase text-[#9f1714]">Filters</h2>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
                {ARCADE_FILTERS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFilter(item.id)}
                    className={`flex items-center justify-between rounded-[8px] border-2 px-4 py-3 text-left font-bold transition focus:outline-none focus:ring-4 focus:ring-[#24d8d0]/30 ${
                      filter === item.id
                        ? "border-[#20100d] bg-[#ffcc3d] shadow-[3px_3px_0_#20100d]"
                        : "border-[#9b8172] bg-white hover:border-[#20100d]"
                    }`}
                  >
                    {item.label}
                    <span
                      className="h-5 w-5 rounded-full border-2 border-[#20100d]"
                      style={{ filter: item.css, background: "linear-gradient(135deg, #ff8b9d, #24d8d0)" }}
                    />
                  </button>
                ))}
              </div>
            </section>

            <div className="my-6 h-[3px] bg-[#20100d]" />

            <div className="grid gap-3">
              <button
                type="button"
                onClick={handleDownload}
                disabled={!downloadAsset || isPreparingDownload}
                className="flex w-full items-center justify-center gap-2 rounded-[8px] border-[3px] border-[#20100d] bg-[#9f1714] px-4 py-3 text-base font-bold text-[#fff8df] shadow-[5px_5px_0_#20100d] transition hover:bg-[#24d8d0] hover:text-[#20100d] focus:outline-none focus:ring-4 focus:ring-[#24d8d0]/30 sm:px-5 sm:py-4 sm:text-lg"
              >
                <Download size={20} aria-hidden="true" />
                {isPreparingDownload ? "Preparing strip" : "Download strip"}
              </button>
              <button
                type="button"
                onClick={handleRetake}
                className="flex w-full items-center justify-center gap-2 rounded-[8px] border-[3px] border-[#20100d] bg-white px-4 py-3 text-base font-bold text-[#20100d] shadow-[5px_5px_0_#20100d] transition hover:bg-[#ffcc3d] focus:outline-none focus:ring-4 focus:ring-[#24d8d0]/30 sm:px-5 sm:py-4 sm:text-lg"
              >
                <RefreshCcw size={20} aria-hidden="true" />
                Start over
              </button>
            </div>
          </motion.div>
        </aside>

        <section className="w-full min-w-0 overflow-x-auto py-4 sm:py-6">
          <motion.div
            initial={{ opacity: 0, y: 28, rotate: -1.5 }}
            animate={{ opacity: 1, y: 0, rotate: -1 }}
            transition={{ delay: 0.08, duration: 0.5 }}
            className="min-w-max sm:max-w-full"
          >
            <div
              ref={stripRef}
              className="rounded-[8px] border-[3px] border-[#20100d] bg-[#fff8df] p-3 pb-6 text-[#20100d] shadow-[8px_8px_0_#20100d,0_18px_48px_rgba(0,0,0,0.34)] sm:p-5 sm:pb-9 sm:shadow-[12px_12px_0_#20100d,0_30px_80px_rgba(0,0,0,0.42)] md:p-7 md:pb-10"
            >
              <div
                className="mb-4 grid"
                style={{
                  gap: `${stripLayout.gapPx}px`,
                  gridTemplateColumns: `repeat(${orderedParticipants.length}, minmax(${stripLayout.columnMinWidth}px, 1fr))`,
                }}
              >
                {orderedParticipants.map((participant) => (
                  <div
                    key={participant.id}
                    className="truncate border-b-2 border-[#20100d]/25 px-1.5 pb-2 text-center text-sm font-bold sm:px-2 sm:text-lg"
                  >
                    {participant.name}
                  </div>
                ))}
              </div>

              <div className="grid" style={{ gap: `${stripLayout.gapPx}px` }}>
                {Array.from({ length: BOOTH_FRAME_COUNT }).map((_, rowIndex) => {
                  const shot = shots.find((item) => item.shotIndex === rowIndex);
                  return (
                    <div
                      key={rowIndex}
                      className="grid"
                      style={{
                        gap: `${stripLayout.gapPx}px`,
                        gridTemplateColumns: `repeat(${orderedParticipants.length}, minmax(${stripLayout.columnMinWidth}px, 1fr))`,
                      }}
                    >
                      {orderedParticipants.map((participant) => {
                        const photo = shot?.photos.find((item) => item.participantId === participant.id);
                        return (
                          <div
                            key={participant.id}
                            className="relative aspect-[4/3] overflow-hidden border-[3px] border-[#20100d] bg-[#160303]"
                          >
                            {photo ? (
                              <img
                                src={photo.data}
                                alt={`${participant.name} shot ${rowIndex + 1}`}
                                className="h-full w-full object-cover"
                                style={{ filter: currentFilterCss }}
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs font-bold uppercase text-white/25">
                                Waiting
                              </div>
                            )}
                            <div className="pointer-events-none absolute left-2 top-2 rounded bg-[#fff8df]/80 px-1.5 py-0.5 text-[10px] font-black text-[#20100d]">
                              {String(rowIndex + 1).padStart(2, "0")}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              <footer className="mt-8 text-center sm:mt-10">
                <h2 className="font-serif text-3xl leading-none [letter-spacing:0] sm:text-4xl">SnapBooth</h2>
                <div className="mx-auto my-3 h-[3px] w-20 bg-[#ffcc3d]" />
                <p className="font-mono text-xs font-bold uppercase text-[#9f1714]">
                  {new Date().toLocaleDateString()}
                </p>
              </footer>
            </div>
          </motion.div>
        </section>
      </div>
    </main>
  );
}
