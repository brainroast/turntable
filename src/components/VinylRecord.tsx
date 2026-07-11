import React from "react";
import { Track } from "../types";

export function VinylRecord(props: {
  isPlaying: boolean;
  currentTrack: Track;
  onPressStart: () => void;
  onPressEnd: () => void;
}) {
  var isPlaying = props.isPlaying;
  var currentTrack = props.currentTrack;
  var onPressStart = props.onPressStart;
  var onPressEnd = props.onPressEnd;

  var rotationStyle = {
    position: "relative" as "relative",
    width: "290px",
    height: "290px",
    borderRadius: "50%",
    border: "1px solid rgba(255,255,255,0.05)",
    WebkitBoxPack: "center" as "center",
    WebkitJustifyContent: "center" as "center",
    justifyContent: "center" as "center",
    WebkitBoxAlign: "center" as "center",
    WebkitAlignItems: "center" as "center",
    alignItems: "center" as "center",
    cursor: "pointer" as "pointer",
    background: "repeating-radial-gradient(circle, #1f1f1f, #111111 1px, #070707 3px, #1a1a1a 4px)",
    backgroundColor: "#111111",
    WebkitAnimation: isPlaying ? "spin 10s linear infinite" : "none",
    animation: isPlaying ? "spin 10s linear infinite" : "none",
    boxShadow: isPlaying
      ? "inset 0 0 45px rgba(0,0,0,1), 0 0 40px rgba(255,255,255,0.04), 0 20px 60px rgba(0,0,0,0.95)"
      : "inset 0 0 45px rgba(0,0,0,1), 0 12px 40px rgba(0,0,0,0.9)",
    WebkitBoxShadow: isPlaying
      ? "inset 0 0 45px rgba(0,0,0,1), 0 0 40px rgba(255,255,255,0.04), 0 20px 60px rgba(0,0,0,0.95)"
      : "inset 0 0 45px rgba(0,0,0,1), 0 12px 40px rgba(0,0,0,0.9)"
  };

  var outerShadowStyle = {
    position: "absolute" as "absolute",
    width: "310px",
    height: "310px",
    borderRadius: "50%",
    backgroundColor: "rgba(0,0,0,0.8)",
    filter: "blur(20px)",
    WebkitFilter: "blur(20px)",
    pointerEvents: "none" as "none"
  };

  var centerLabelStyle = {
    position: "absolute" as "absolute",
    width: "140px",
    height: "140px",
    borderRadius: "50%",
    backgroundColor: "#050505",
    border: "4px solid #141414",
    overflow: "hidden" as "hidden",
    zIndex: 10,
    pointerEvents: "none" as "none"
  };

  var shineStyle = {
    position: "absolute" as "absolute",
    left: "0px",
    top: "0px",
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    pointerEvents: "none" as "none",
    opacity: 0.35,
    background: "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 50%, rgba(0,0,0,0.4) 100%)"
  };

  var imageStyle = {
    width: "100%",
    height: "100%",
    objectFit: "cover" as "cover",
    borderRadius: "50%"
  };

  var emptyArtStyle = {
    width: "100%",
    height: "100%",
    backgroundColor: "#1c1c1c",
    WebkitBoxAlign: "center" as "center",
    WebkitAlignItems: "center" as "center",
    alignItems: "center" as "center",
    WebkitBoxPack: "center" as "center",
    WebkitJustifyContent: "center" as "center",
    justifyContent: "center" as "center"
  };

  var emptyTextStyle = {
    fontFamily: "monospace",
    fontSize: "9px",
    letterSpacing: "1.5px",
    color: "#666666"
  };

  var handlePointerDown = function (e: React.PointerEvent) {
    e.preventDefault();
    onPressStart();
  };

  var handlePointerUp = function () {
    onPressEnd();
  };

  var imageUrl = currentTrack.thumbnail
    ? currentTrack.thumbnail.replace("img.youtube.com", "i.ytimg.com")
    : "";

  return (
    <div className="flex-legacy" style={{ position: "relative", width: "320px", height: "320px", WebkitBoxPack: "center", WebkitJustifyContent: "center", justifyContent: "center", WebkitBoxAlign: "center", WebkitAlignItems: "center", alignItems: "center" }}>
      <div style={outerShadowStyle} />

      <div
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="flex-legacy"
        style={rotationStyle}
        title="TEKAN DAN TAHAN UNTUK MEMUTAR"
      >
        <div style={shineStyle} />

        <div style={centerLabelStyle}>
          {imageUrl ? (
            <div style={{ position: "relative", width: "100%", height: "100%" }}>
              <img
                src={imageUrl}
                alt=""
                style={imageStyle}
                onError={function (e) {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=200&auto=format&fit=crop";
                }}
              />
              <div style={{ position: "absolute", left: "0px", top: "0px", width: "100%", height: "100%", borderRadius: "50%", border: "2px solid rgba(245, 158, 11, 0.2)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", left: "0px", top: "0px", width: "100%", height: "100%", borderRadius: "50%", background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.15) 0%, transparent 60%)", pointerEvents: "none" }} />
            </div>
          ) : (
            <div className="flex-legacy" style={emptyArtStyle}>
              <span style={emptyTextStyle}>NO ART</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
