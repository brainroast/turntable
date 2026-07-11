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
    width: "410px",
    height: "410px",
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
    width: "420px",
    height: "420px",
    borderRadius: "50%",
    backgroundColor: "rgba(0,0,0,0.8)",
    filter: "blur(20px)",
    WebkitFilter: "blur(20px)",
    pointerEvents: "none" as "none"
  };

  var centerLabelStyle = {
    position: "absolute" as "absolute",
    width: "180px",
    height: "180px",
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

  var imgErrorState = React.useState(false);
  var hasImgError = imgErrorState[0];
  var setHasImgError = imgErrorState[1];

  React.useEffect(function () {
    setHasImgError(false);
  }, [currentTrack.videoId]);

  var getInitials = function () {
    if (!currentTrack || !currentTrack.title) return "🎵";
    var title = currentTrack.title.trim();
    if (!title || title === "No Track Playing" || title === "Unknown Title") return "🎵";
    var parts = title.split(/[\s\-]+/);
    var res = "";
    for (var i = 0; i < parts.length && res.length < 2; i++) {
      var p = parts[i].trim();
      if (p) {
        var char = p.charAt(0);
        if (char) res += char.toUpperCase();
      }
    }
    return res || "🎵";
  };

  var handlePressStart = function (e: any) {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
    }
    onPressStart();
  };

  var handlePressEnd = function (e: any) {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
    }
    onPressEnd();
  };

  var imageUrl = currentTrack.thumbnail
    ? currentTrack.thumbnail.replace("img.youtube.com", "i.ytimg.com")
    : "";

  var fallbackLabelStyle = {
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    background: "radial-gradient(circle, #221c16 0%, #130f0c 70%, #000000 100%)",
    border: "2px solid #d97706",
    display: "flex",
    flexDirection: "column" as "column",
    alignItems: "center",
    justifyContent: "center",
    position: "relative" as "relative",
    color: "#fbbf24",
    padding: "8px",
    textAlign: "center" as "center",
    boxSizing: "border-box" as "border-box",
    WebkitTouchCallout: "none" as "none",
    WebkitUserSelect: "none" as "none",
    userSelect: "none" as "none"
  };

  return (
    <div className="flex-legacy" style={{ position: "relative", width: "420px", height: "420px", WebkitBoxPack: "center", WebkitJustifyContent: "center", justifyContent: "center", WebkitBoxAlign: "center", WebkitAlignItems: "center", alignItems: "center", WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none" }}>
      <div style={outerShadowStyle} />

      <div
        onTouchStart={handlePressStart}
        onTouchEnd={handlePressEnd}
        onTouchCancel={handlePressEnd}
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressEnd}
        className="flex-legacy"
        style={{
          ...rotationStyle,
          WebkitTouchCallout: "none",
          WebkitUserSelect: "none",
          userSelect: "none"
        }}
        title="TEKAN DAN TAHAN UNTUK MEMUTAR"
      >
        <div style={shineStyle} />

        <div style={{ ...centerLabelStyle, WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none" }}>
          {imageUrl && !hasImgError ? (
            <div style={{ position: "relative", width: "100%", height: "100%", WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none" }}>
              <img
                src={imageUrl}
                alt=""
                draggable="false"
                style={{
                  ...imageStyle,
                  pointerEvents: "none",
                  WebkitUserSelect: "none",
                  userSelect: "none",
                  WebkitTouchCallout: "none"
                }}
                onError={function () {
                  setHasImgError(true);
                }}
              />
              <div style={{ position: "absolute", left: "0px", top: "0px", width: "100%", height: "100%", borderRadius: "50%", border: "2px solid rgba(245, 158, 11, 0.2)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", left: "0px", top: "0px", width: "100%", height: "100%", borderRadius: "50%", background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.15) 0%, transparent 60%)", pointerEvents: "none" }} />
            </div>
          ) : (
            <div style={fallbackLabelStyle}>
              <div style={{ position: "absolute", left: "0px", top: "0px", width: "100%", height: "100%", borderRadius: "50%", border: "1px dashed rgba(251, 191, 36, 0.2)", pointerEvents: "none" }} />
              <span style={{ fontSize: "28px", fontWeight: "bold", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "1.5px", color: "#fbbf24", textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}>
                {getInitials()}
              </span>
              <span style={{ fontSize: "7px", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "1px", color: "rgba(251, 191, 36, 0.6)", marginTop: "2px", maxWidth: "85%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {currentTrack.artist || "TRACK"}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
