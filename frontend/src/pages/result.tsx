import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Download, RefreshCcw, Sparkles } from "lucide-react";
import { usePhotoStore } from "@/lib/store";
import { ARCADE_FILTERS, BOOTH_FRAME_COUNT } from "@/lib/arcade-ui";
import { getResultStripLayout } from "@/lib/result-strip-layout";

export default function Result() {
  const [, setLocation] = useLocation();
  const store = usePhotoStore();
  const { shots, participants, mode, filter, setFilter, clear } = store;
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!shots || shots.length === 0) {
      setLocation("/");
    }
  }, [shots, setLocation]);

  const handleRetake = () => {
    clear();
    setLocation("/");
  };

  const handleDownload = async () => {
    if (!shots || shots.length === 0 || !stripRef.current) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const activeFilter = ARCADE_FILTERS.find((item) => item.id === filter) || ARCADE_FILTERS[0];
    const orderedParticipants = [...participants].sort((a, b) => a.id.localeCompare(b.id));

    const cols = orderedParticipants.length || 1;
    const rows = shots.length;
    const imgWidth = 400;
    const imgHeight = 533;
    const padding = 60;
    const colGap = 30;
    const rowGap = 30;
    const footerHeight = 200;
    const headerHeight = 80;

    canvas.width = imgWidth * cols + colGap * (cols - 1) + padding * 2;
    canvas.height = headerHeight + imgHeight * rows + rowGap * (rows - 1) + padding * 2 + footerHeight;

    ctx.fillStyle = "#fff8df";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = "bold 32px 'DM Sans', sans-serif";
    ctx.fillStyle = "#20100d";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";

    orderedParticipants.forEach((participant, colIndex) => {
      const x = padding + colIndex * (imgWidth + colGap) + imgWidth / 2;
      ctx.fillText(participant.name, x, padding + headerHeight - 20);
    });

    for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
      const shot = shots.find((item) => item.shotIndex === rowIndex);
      if (!shot) continue;

      for (let colIndex = 0; colIndex < cols; colIndex++) {
        const participant = orderedParticipants[colIndex];
        const photo = shot.photos.find((item) => item.participantId === participant.id);

        if (photo) {
          const img = new Image();
          img.crossOrigin = "anonymous";
          await new Promise((resolve) => {
            img.onload = resolve;
            img.src = photo.data;
          });

          const x = padding + colIndex * (imgWidth + colGap);
          const y = padding + headerHeight + rowIndex * (imgHeight + rowGap);

          ctx.filter = activeFilter.canvasParams;
          ctx.drawImage(img, x, y, imgWidth, imgHeight);
          ctx.filter = "none";
          ctx.strokeStyle = "#20100d";
          ctx.lineWidth = 6;
          ctx.strokeRect(x, y, imgWidth, imgHeight);
        }
      }
    }

    const footerY = canvas.height - footerHeight / 2;
    ctx.fillStyle = "#20100d";
    ctx.font = "bold 80px 'Limelight', serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SnapBooth", canvas.width / 2, footerY - 20);

    ctx.font = "30px 'DM Sans', sans-serif";
    ctx.fillStyle = "#9f1714";
    ctx.fillText(new Date().toLocaleDateString(), canvas.width / 2, footerY + 50);

    const link = document.createElement("a");
    link.download = `snapbooth-${mode || "multiplayer"}-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  if (!shots || shots.length === 0) return null;

  const currentFilterCss = ARCADE_FILTERS.find((item) => item.id === filter)?.css || "none";
  const orderedParticipants = [...participants].sort((a, b) => a.id.localeCompare(b.id));
  const stripLayout = getResultStripLayout(orderedParticipants.length);

  return (
    <main className="arcade-route min-h-[100dvh] bg-[#2c0707] text-[#fff4d1]">
      <div className="film-grain" />

      <div className="mx-auto grid min-h-[100dvh] max-w-7xl gap-4 px-4 py-4 sm:gap-6 sm:px-5 sm:py-6 lg:grid-cols-[360px_1fr] lg:px-8">
        <aside className="flex flex-col justify-center">
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
                className="flex w-full items-center justify-center gap-2 rounded-[8px] border-[3px] border-[#20100d] bg-[#9f1714] px-4 py-3 text-base font-bold text-[#fff8df] shadow-[5px_5px_0_#20100d] transition hover:bg-[#24d8d0] hover:text-[#20100d] focus:outline-none focus:ring-4 focus:ring-[#24d8d0]/30 sm:px-5 sm:py-4 sm:text-lg"
              >
                <Download size={20} aria-hidden="true" />
                Download strip
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

        <section className="w-full overflow-x-auto py-4 sm:py-6">
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
