import { Link } from "wouter";
import { ArrowLeft, AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <main className="arcade-route flex min-h-[100dvh] items-center justify-center bg-[#2c0707] px-5 py-10 text-[#fff4d1]">
      <div className="film-grain" />
      <section className="w-full max-w-[calc(100vw-4rem)] overflow-hidden rounded-[8px] border-[3px] border-[#20100d] bg-[#fff8df] p-6 text-[#20100d] shadow-[6px_6px_0_#ffcc3d] md:max-w-xl md:p-8 md:shadow-[8px_8px_0_#ffcc3d]">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-[8px] border-[3px] border-[#20100d] bg-[#9f1714] text-[#fff8df]">
          <AlertCircle size={28} aria-hidden="true" />
        </div>
        <p className="mb-2 text-sm font-bold uppercase text-[#9f1714]">404 ticket jam</p>
        <h1 className="font-serif text-5xl leading-none [letter-spacing:0]">Page not found</h1>
        <p className="mt-5 max-w-[18rem] font-medium leading-7 text-[#5f3427] md:max-w-md">
          This booth slot is empty. Head back to the cabinet and start a fresh strip.
        </p>
        <Link
          href="/"
          className="mt-7 inline-flex items-center gap-2 rounded-[8px] border-[3px] border-[#20100d] bg-[#ffcc3d] px-5 py-3 font-bold text-[#20100d] shadow-[5px_5px_0_#20100d] transition hover:bg-[#24d8d0] focus:outline-none focus:ring-4 focus:ring-[#24d8d0]/30"
        >
          <ArrowLeft size={18} aria-hidden="true" />
          Back to SnapBooth
        </Link>
      </section>
    </main>
  );
}
