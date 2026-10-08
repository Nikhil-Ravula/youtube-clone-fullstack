"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Volume2, VolumeX, Play, Pause, RotateCcw, RotateCw, Maximize } from "lucide-react";

import { getMediaUrl } from "@/lib/mediaUrl";

interface VideoPlayerProps {
  video: {
    _id: string;
    videotitle?: string;
    filepath?: string;
  };
}

export default function VideoPlayer({ video }: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [feedback, setFeedback] = useState<{ icon: any; text: string } | null>(null);
  const [hasError, setHasError] = useState(false);
  const feedbackTimer = useRef<NodeJS.Timeout | null>(null);

  const videoSrc = getMediaUrl(video?.filepath);

  const showFeedback = useCallback((icon: any, text: string) => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    setFeedback({ icon, text });
    feedbackTimer.current = setTimeout(() => {
      setFeedback(null);
    }, 700);
  }, []);

  // Keyboard controls like real YouTube
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (
        activeTag === "input" ||
        activeTag === "textarea" ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      const v = videoRef.current;
      if (!v) return;

      switch (e.key.toLowerCase()) {
        case " ":
        case "k": {
          e.preventDefault();
          if (v.paused) {
            v.play();
            showFeedback(Play, "Play");
          } else {
            v.pause();
            showFeedback(Pause, "Pause");
          }
          break;
        }
        case "arrowleft":
        case "j": {
          e.preventDefault();
          const skip = e.key.toLowerCase() === "j" ? 10 : 5;
          v.currentTime = Math.max(0, v.currentTime - skip);
          showFeedback(RotateCcw, `-${skip}s`);
          break;
        }
        case "arrowright":
        case "l": {
          e.preventDefault();
          const skip = e.key.toLowerCase() === "l" ? 10 : 5;
          v.currentTime = Math.min(v.duration || 0, v.currentTime + skip);
          showFeedback(RotateCw, `+${skip}s`);
          break;
        }
        case "m": {
          e.preventDefault();
          v.muted = !v.muted;
          showFeedback(v.muted ? VolumeX : Volume2, v.muted ? "Mute" : "Unmute");
          break;
        }
        case "f": {
          e.preventDefault();
          if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen?.();
            showFeedback(Maximize, "Fullscreen");
          } else {
            document.exitFullscreen?.();
          }
          break;
        }
        case "arrowup": {
          e.preventDefault();
          v.volume = Math.min(1, Number((v.volume + 0.1).toFixed(1)));
          v.muted = false;
          showFeedback(Volume2, `${Math.round(v.volume * 100)}%`);
          break;
        }
        case "arrowdown": {
          e.preventDefault();
          v.volume = Math.max(0, Number((v.volume - 0.1).toFixed(1)));
          showFeedback(v.volume === 0 ? VolumeX : Volume2, `${Math.round(v.volume * 100)}%`);
          break;
        }
        case "0":
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
        case "8":
        case "9": {
          e.preventDefault();
          const percent = parseInt(e.key, 10) / 10;
          if (v.duration) {
            v.currentTime = v.duration * percent;
            showFeedback(RotateCw, `${percent * 100}%`);
          }
          break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    };
  }, [showFeedback]);

  // Reload when video changes
  useEffect(() => {
    setHasError(false);
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {
        // Autoplay may be blocked by browser policy without user interaction; this is normal
      });
    }
  }, [video?._id, videoSrc]);

  return (
    <div
      ref={containerRef}
      className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-lg select-none group"
    >
      {hasError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-neutral-900 p-6 text-center">
          <p className="text-lg font-medium mb-1">Video playback unavailable</p>
          <p className="text-sm text-gray-400">
            The video file could not be loaded from the server.
          </p>
        </div>
      ) : (
        <video
          key={video?._id}
          ref={videoRef}
          className="w-full h-full object-contain cursor-pointer"
          controls
          autoPlay
          playsInline
          poster="/placeholder.svg?height=480&width=854"
          onError={() => setHasError(true)}
        >
          {videoSrc && <source src={videoSrc} type="video/mp4" />}
          Your browser does not support the video tag.
        </video>
      )}

      {/* Visual Feedback Badge (YouTube style animation) */}
      {feedback && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-20">
          <div className="flex items-center gap-2 px-5 py-3 rounded-full bg-black/75 text-white backdrop-blur-sm shadow-xl transition-all scale-100 animate-in fade-in zoom-in-95 duration-150">
            <feedback.icon className="w-6 h-6 text-white" />
            <span className="font-semibold text-sm">{feedback.text}</span>
          </div>
        </div>
      )}
    </div>
  );
}
