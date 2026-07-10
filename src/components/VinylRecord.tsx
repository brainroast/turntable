import React from "react";
import { Track } from "../types";

interface VinylRecordProps {
  isPlaying: boolean;
  currentTrack: Track;
  onPressStart: () => void;
  onPressEnd: () => void;
}

export const VinylRecord: React.FC<VinylRecordProps> = ({
  isPlaying,
  currentTrack,
  onPressStart,
  onPressEnd,
}) => {
  return (
    <div className="relative flex items-center justify-center select-none w-full h-full max-w-full max-h-full aspect-square">
      {/* Vinyl Outer Shadow/Glow (Proportional to size) */}
      <div className={`absolute w-[104%] h-[104%] rounded-full bg-black/80 blur-3xl pointer-events-none transition-all duration-1000 ${
        isPlaying ? "scale-105 opacity-90" : "scale-100 opacity-70"
      }`} />

      {/* Vinyl Body - Highly Tactile & Responsive */}
      <div
        onPointerDown={(e) => {
          e.preventDefault();
          onPressStart();
        }}
        onPointerUp={onPressEnd}
        onPointerLeave={onPressEnd}
        onPointerCancel={onPressEnd}
        className="relative w-full h-full max-w-[250px] max-h-[250px] sm:max-w-[340px] sm:max-h-[340px] md:max-w-[420px] md:max-h-[420px] lg:max-w-[480px] lg:max-h-[480px] xl:max-w-[540px] xl:max-h-[540px] aspect-square rounded-full border border-neutral-800/40 flex items-center justify-center transition-all duration-1000 ease-out animate-[spin_10s_linear_infinite] cursor-grab active:cursor-grabbing touch-none select-none pointer-events-auto"
        style={{
          background: "repeating-radial-gradient(circle, #1f1f1f, #111111 1px, #070707 3px, #1a1a1a 4px)",
          animationPlayState: isPlaying ? "running" : "paused",
          boxShadow: isPlaying 
            ? "inset 0 0 45px rgba(0,0,0,1), 0 0 40px rgba(255,255,255,0.04), 0 20px 60px rgba(0,0,0,0.95)"
            : "inset 0 0 45px rgba(0,0,0,1), 0 12px 40px rgba(0,0,0,0.9)",
        }}
        title="HOLD TO PLAY / TEKAN DAN TAHAN UNTUK MEMUTAR"
      >
        {/* Grooves & Texture Overlay */}
        <div className="absolute inset-0 rounded-full bg-black/30 mix-blend-overlay pointer-events-none" />

        {/* Dynamic Conic Light Shine (Gives 3D reflective feel) */}
        <div
          className="absolute inset-0 rounded-full opacity-40 mix-blend-screen pointer-events-none"
          style={{
            background: `conic-gradient(
              from 0deg,
              transparent 0%,
              rgba(255, 255, 255, 0.12) 12%,
              transparent 24%,
              transparent 50%,
              rgba(255, 255, 255, 0.12) 62%,
              transparent 74%,
              transparent 100%
            )`,
          }}
        />

        {/* Center Label (Album Art - Redesigned to be bigger, ultra-premium and with NO HOLES) */}
        <div 
          className="absolute w-[48%] h-[48%] rounded-full bg-neutral-950 flex items-center justify-center overflow-hidden z-10 pointer-events-none transition-all duration-500"
          style={{
            boxShadow: "0 6px 25px rgba(0,0,0,0.85), inset 0 0 20px rgba(0,0,0,0.9)",
            border: "4px solid #141414",
          }}
        >
          {currentTrack.thumbnail ? (
            <div className="relative w-full h-full rounded-full overflow-hidden bg-black">
              <img
                src={currentTrack.thumbnail}
                alt={currentTrack.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover rounded-full select-none scale-105"
              />
              
              {/* Premium metallic brass/gold accent ring borders for physical luxury vibe */}
              <div className="absolute inset-0 rounded-full border-[3px] border-amber-500/20 pointer-events-none" />
              <div className="absolute inset-[6px] rounded-full border border-black/40 pointer-events-none" />
              <div className="absolute inset-[12px] rounded-full border border-white/5 pointer-events-none" />
              
              {/* Dynamic shining glass reflection overlay 1 (Conic gloss) */}
              <div 
                className="absolute inset-0 opacity-30 pointer-events-none mix-blend-overlay"
                style={{
                  background: "linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 50%, rgba(0,0,0,0.5) 100%)"
                }}
              />
              
              {/* Dynamic shining glass reflection overlay 2 (Radial gloss highlight) */}
              <div 
                className="absolute inset-0 opacity-20 pointer-events-none mix-blend-screen"
                style={{
                  background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.7) 0%, transparent 55%)"
                }}
              />

              {/* Concentric micro record lines on the label for realistic physics tactile effect */}
              <div 
                className="absolute inset-0 rounded-full pointer-events-none opacity-[0.15]"
                style={{
                  background: "repeating-radial-gradient(circle, transparent, transparent 4px, rgba(255,255,255,0.3) 5px)"
                }}
              />
            </div>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-neutral-800 to-neutral-950 flex items-center justify-center">
              <span className="text-[10px] font-mono tracking-widest text-neutral-500 uppercase">NO ART</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


