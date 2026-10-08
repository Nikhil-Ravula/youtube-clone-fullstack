import React, { useEffect, useRef, useState, useCallback } from "react";
import { Mic, MicOff, VideoOff, Hand, Pin, Shield, Signal, SignalMedium, SignalLow, Volume2 } from "lucide-react";
import { Participant } from "@/lib/webrtc/useMeetingRoom";

interface VideoTileProps {
  stream: MediaStream | null;
  participant: Participant;
  isLocal?: boolean;
  isPinned?: boolean;
  onPin?: () => void;
  mirror?: boolean;
  className?: string;
}

export const VideoTile: React.FC<VideoTileProps> = ({
  stream,
  participant,
  isLocal = false,
  isPinned = false,
  onPin,
  mirror = false,
  className = "",
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [, setTrackVersion] = useState(0);

  // Check if an active, live video track is present and camera is not off
  const videoTrack = stream ? stream.getVideoTracks()[0] : null;
  const hasVideoTrack = Boolean(
    stream &&
      videoTrack &&
      videoTrack.readyState !== "ended" &&
      !participant.isCameraOff
  );

  const attachVideoStream = useCallback(
    (videoEl: HTMLVideoElement | null) => {
      if (!videoEl) return;
      if (stream) {
        if (videoEl.srcObject !== stream) {
          videoEl.srcObject = stream;
        }
        if (isLocal) {
          videoEl.muted = true;
          videoEl.play().catch(() => {});
        } else {
          // For remote: attempt unmuted play first (succeeds on desktop)
          videoEl.muted = false;
          const playPromise = videoEl.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                setAutoplayBlocked(false);
              })
              .catch((err) => {
                console.warn("[VideoTile] Remote video unmuted play blocked by mobile policy, playing muted:", err);
                // Mute video so frames play smoothly without freezing
                videoEl.muted = true;
                videoEl.play().catch(() => {});
                setAutoplayBlocked(true);
              });
          }
        }
      } else {
        videoEl.srcObject = null;
      }
    },
    [stream, isLocal]
  );

  const attachAudioStream = useCallback(
    (audioEl: HTMLAudioElement | null) => {
      if (!audioEl || isLocal) return;
      if (stream) {
        if (audioEl.srcObject !== stream) {
          audioEl.srcObject = stream;
        }
        audioEl.volume = 1.0;
        const playPromise = audioEl.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setAutoplayBlocked(false);
            })
            .catch((err) => {
              console.warn("[VideoTile] Remote audio play blocked by mobile policy:", err);
              setAutoplayBlocked(true);
            });
        }
      } else {
        audioEl.srcObject = null;
      }
    },
    [stream, isLocal]
  );

  // Unblock all audio when user interacts with the page
  const unlockAudio = useCallback(() => {
    if (!isLocal) {
      if (videoRef.current) {
        videoRef.current.muted = false;
        videoRef.current
          .play()
          .then(() => setAutoplayBlocked(false))
          .catch(() => {});
      }
      if (audioRef.current) {
        audioRef.current
          .play()
          .then(() => setAutoplayBlocked(false))
          .catch(() => {});
      }
    }
  }, [isLocal]);

  // Global listener: First user tap on document unlocks any blocked remote audio elements
  useEffect(() => {
    window.addEventListener("click", unlockAudio);
    window.addEventListener("touchstart", unlockAudio);
    return () => {
      window.removeEventListener("click", unlockAudio);
      window.removeEventListener("touchstart", unlockAudio);
    };
  }, [unlockAudio]);

  // Track listeners for when tracks arrive, mute, unmute, or end
  useEffect(() => {
    if (!stream) return;

    const onTrackChange = () => {
      setTrackVersion((v) => v + 1);
      if (videoRef.current) attachVideoStream(videoRef.current);
      if (audioRef.current) attachAudioStream(audioRef.current);
    };

    stream.addEventListener("addtrack", onTrackChange);
    stream.addEventListener("removetrack", onTrackChange);

    const tracks = stream.getTracks();
    tracks.forEach((t) => {
      t.addEventListener("mute", onTrackChange);
      t.addEventListener("unmute", onTrackChange);
      t.addEventListener("ended", onTrackChange);
    });

    if (videoRef.current) attachVideoStream(videoRef.current);
    if (audioRef.current) attachAudioStream(audioRef.current);

    return () => {
      stream.removeEventListener("addtrack", onTrackChange);
      stream.removeEventListener("removetrack", onTrackChange);
      tracks.forEach((t) => {
        t.removeEventListener("mute", onTrackChange);
        t.removeEventListener("unmute", onTrackChange);
        t.removeEventListener("ended", onTrackChange);
      });
    };
  }, [stream, attachVideoStream, attachAudioStream]);

  // Click on tile to unblock autoplay
  const handleTileClick = () => {
    unlockAudio();
  };

  const renderQualityIcon = (quality?: string) => {
    switch (quality) {
      case "excellent":
        return (
          <span title="Connection: Excellent">
            <Signal className="w-3.5 h-3.5 text-emerald-400" />
          </span>
        );
      case "good":
        return (
          <span title="Connection: Good">
            <Signal className="w-3.5 h-3.5 text-green-400" />
          </span>
        );
      case "fair":
        return (
          <span title="Connection: Fair">
            <SignalMedium className="w-3.5 h-3.5 text-amber-400" />
          </span>
        );
      case "poor":
        return (
          <span title="Connection: Poor">
            <SignalLow className="w-3.5 h-3.5 text-rose-500" />
          </span>
        );
      default:
        return (
          <span title="Connection: Stable">
            <Signal className="w-3.5 h-3.5 text-emerald-400" />
          </span>
        );
    }
  };

  return (
    <div
      onClick={handleTileClick}
      className={`relative group overflow-hidden rounded-xl sm:rounded-2xl bg-zinc-900 border transition-all duration-300 flex items-center justify-center w-full h-full min-h-0 min-w-0 ${
        participant.isSpeaking
          ? "border-emerald-500 ring-2 ring-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
          : "border-zinc-800 hover:border-zinc-700"
      } ${className}`}
    >
      {/* Video Element: Plays live video frames seamlessly */}
      <video
        ref={(el) => {
          videoRef.current = el;
          if (el) attachVideoStream(el);
        }}
        autoPlay
        playsInline
        muted={isLocal}
        className={`w-full h-full object-cover rounded-xl sm:rounded-2xl transition-opacity duration-200 ${
          mirror ? "-scale-x-100" : ""
        } ${hasVideoTrack ? "opacity-100 relative" : "opacity-0 pointer-events-none absolute inset-0"}`}
      />

      {/* Dedicated Remote Audio Element: Redundant audio pipeline ensuring sound is audible */}
      {!isLocal && stream && (
        <audio
          ref={(el) => {
            audioRef.current = el;
            if (el) attachAudioStream(el);
          }}
          autoPlay
          playsInline
        />
      )}

      {/* Avatar Placeholder when Camera is off or video is loading */}
      {!hasVideoTrack && (
        <div className="flex flex-col items-center justify-center p-2 sm:p-4 text-center select-none w-full h-full">
          <div className="relative">
            {participant.userImage ? (
              <img
                src={participant.userImage}
                alt={participant.userName}
                className="w-11 h-11 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full border-2 border-zinc-700 object-cover shadow-lg"
              />
            ) : (
              <div className="w-11 h-11 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-tr from-rose-600 to-indigo-600 flex items-center justify-center text-white text-base sm:text-xl md:text-2xl font-bold shadow-lg border-2 border-zinc-700">
                {participant.userName ? participant.userName.charAt(0).toUpperCase() : "U"}
              </div>
            )}
            {participant.isSpeaking && (
              <span className="absolute -inset-1 rounded-full border-2 border-emerald-400 animate-ping opacity-75" />
            )}
          </div>
          <span className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs md:text-sm font-medium text-zinc-300 truncate max-w-[100px] sm:max-w-[180px]">
            {participant.userName} {isLocal && "(You)"}
          </span>
          <span className="text-[9px] sm:text-[11px] text-zinc-500 flex items-center gap-1 mt-0.5">
            {participant.isCameraOff ? (
              <>
                <VideoOff className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-zinc-500" /> Camera off
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> Connecting video...
              </>
            )}
          </span>
        </div>
      )}

      {/* Non-blocking Audio Autoplay Prompt: video remains 100% visible, user can tap pill to enable audio */}
      {autoplayBlocked && !isLocal && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleTileClick();
          }}
          className="absolute bottom-11 sm:bottom-12 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-rose-600/90 hover:bg-rose-500 text-white text-[10px] sm:text-xs font-semibold px-2.5 py-1 rounded-full shadow-lg cursor-pointer animate-pulse backdrop-blur-sm transition-all"
        >
          <Volume2 className="w-3.5 h-3.5" />
          <span>Tap for sound</span>
        </button>
      )}

      {/* Top Left: Badges (Role, Quality) */}
      <div className="absolute top-1.5 left-1.5 sm:top-2.5 sm:left-2.5 flex items-center gap-1 z-10 pointer-events-none">
        {participant.role === "host" && (
          <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] sm:text-[10px] font-semibold bg-amber-500/90 text-black shadow-md backdrop-blur-sm">
            <Shield className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Host
          </span>
        )}
        {participant.role === "cohost" && (
          <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] sm:text-[10px] font-semibold bg-indigo-500/90 text-white shadow-md backdrop-blur-sm">
            <Shield className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Co-host
          </span>
        )}
        {participant.isScreenSharing && (
          <span className="px-1.5 py-0.5 rounded-full text-[8px] sm:text-[10px] font-medium bg-blue-600/90 text-white shadow-md backdrop-blur-sm">
            Screen
          </span>
        )}
        <div className="bg-black/40 backdrop-blur-md p-0.5 sm:p-1 rounded-md flex items-center">
          {renderQualityIcon(participant.quality)}
        </div>
      </div>

      {/* Top Right: Pin & Quick Actions */}
      <div className="absolute top-1.5 right-1.5 sm:top-2.5 sm:right-2.5 flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
        {onPin && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPin();
            }}
            className={`p-1 sm:p-1.5 rounded-lg text-white backdrop-blur-md transition-colors ${
              isPinned ? "bg-red-600 hover:bg-red-700" : "bg-black/60 hover:bg-black/80"
            }`}
            title={isPinned ? "Unpin video" : "Pin video"}
          >
            <Pin className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>
        )}
      </div>

      {/* Hand Raised Floating Badge */}
      {participant.handRaised && (
        <div className="absolute top-1.5 sm:top-2.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-amber-500 text-black text-[9px] sm:text-xs font-bold px-2 sm:px-3 py-0.5 sm:py-1 rounded-full shadow-lg animate-bounce pointer-events-none">
          <Hand className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          <span>Raised</span>
        </div>
      )}

      {/* Bottom Overlay: Participant Name & Audio/Video Status */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-1.5 sm:p-2.5 pt-3 sm:pt-5 flex items-center justify-between text-white z-10 pointer-events-none">
        <div className="flex items-center gap-1 sm:gap-1.5 truncate max-w-[70%]">
          <span className="text-[10px] sm:text-xs md:text-sm font-medium truncate drop-shadow-md">
            {participant.userName} {isLocal && "(You)"}
          </span>
        </div>

        <div className="flex items-center gap-1 pointer-events-auto shrink-0">
          {participant.isMuted ? (
            <span className="p-0.5 sm:p-1 rounded-md bg-rose-600/90 text-white shadow-sm" title="Microphone Muted">
              <MicOff className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </span>
          ) : (
            <span
              className={`p-0.5 sm:p-1 rounded-md transition-colors ${
                participant.isSpeaking ? "bg-emerald-600 text-white animate-pulse" : "bg-black/40 text-zinc-300"
              }`}
              title={participant.isSpeaking ? "Speaking" : "Microphone Active"}
            >
              <Mic className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
