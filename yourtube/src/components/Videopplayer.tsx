"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  Volume2,
  Volume1,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Maximize,
  Minimize,
  Tv,
  PictureInPicture2,
  Subtitles,
  Settings,
  Lock,
  Crown,
  Sparkles,
  ShieldCheck,
  SkipForward,
  Loader2,
  Check,
  X,
  ChevronRight,
} from "lucide-react";
import { getMediaUrl } from "@/lib/mediaUrl";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { Button } from "./ui/button";
import { SubscriptionPlanModal } from "./SubscriptionPlanModal";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/router";

interface VideoPlayerProps {
  video: {
    _id: string;
    videotitle?: string;
    filepath?: string;
    isPremium?: boolean;
    isCourse?: boolean;
    requiredPlan?: string;
  };
  isTheaterMode?: boolean;
  onToggleTheaterMode?: () => void;
  nextVideo?: any;
  onNextVideo?: () => void;
}

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

const QUALITY_LEVELS = [
  { id: "480p", label: "480p SD", requiredTier: "Free", rank: 0 },
  { id: "720p", label: "720p HD", requiredTier: "Bronze", rank: 1 },
  { id: "1080p", label: "1080p Full HD", requiredTier: "Silver", rank: 2 },
  { id: "4K", label: "4K Ultra HD & 60fps", requiredTier: "Gold", rank: 3 },
];

export default function VideoPlayer({
  video,
  isTheaterMode = false,
  onToggleTheaterMode,
  nextVideo,
  onNextVideo,
}: VideoPlayerProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const { user, refreshUser } = useUser();

  // Core Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedPercent, setBufferedPercent] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPiPActive, setIsPiPActive] = useState(false);
  const [showRemainingTime, setShowRemainingTime] = useState(false);
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [isAutoplayEnabled, setIsAutoplayEnabled] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Auto-hide controls
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideControlsTimer = useRef<NodeJS.Timeout | null>(null);

  // Menus
  const [settingsTab, setSettingsTab] = useState<"main" | "speed" | "quality">("main");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState("480p");

  // Hover Preview Scrubbing
  const [isHoveringTimeline, setIsHoveringTimeline] = useState(false);
  const [hoverTime, setHoverTime] = useState(0);
  const [hoverPosition, setHoverPosition] = useState(0); // 0 to 100%

  // Volume slider hover
  const [isVolumeHovered, setIsVolumeHovered] = useState(false);

  // Feedback Pill & Center Play animation
  const [feedback, setFeedback] = useState<{ icon: any; text: string } | null>(null);
  const [centerAnimation, setCenterAnimation] = useState<"play" | "pause" | null>(null);
  const feedbackTimer = useRef<NodeJS.Timeout | null>(null);
  const centerTimer = useRef<NodeJS.Timeout | null>(null);

  // Watch Progress & Auto-Resume
  const [resumedFrom, setResumedFrom] = useState<number | null>(null);
  const lastSavedTime = useRef<number>(0);
  const hasAutoResumed = useRef<boolean>(false);

  // Autoplay Countdown
  const [autoplayCountdown, setAutoplayCountdown] = useState<number | null>(null);
  const autoplayTimer = useRef<NodeJS.Timeout | null>(null);

  // Subscription Tier & Paywall Gating
  const [accessData, setAccessData] = useState<{
    hasFullAccess: boolean;
    userPlan: string;
    isPremium: boolean;
    isCourse: boolean;
    requiredPlan: string;
    maxQualityAllowed: string;
    adFree: boolean;
    previewDurationSec: number;
    reason: string | null;
  } | null>(null);
  const [isPaywalled, setIsPaywalled] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);

  const videoSrc = getMediaUrl(video?.filepath);
  const userPlan = user?.subscriptionPlan || "Free";
  const PLAN_RANK: Record<string, number> = { Free: 0, Bronze: 1, Silver: 2, Gold: 3 };
  const userRank = PLAN_RANK[userPlan] || 0;

  // Format seconds to mm:ss or hh:mm:ss
  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
    }
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Show floating HUD feedback
  const showFeedback = useCallback((icon: any, text: string) => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    setFeedback({ icon, text });
    feedbackTimer.current = setTimeout(() => {
      setFeedback(null);
    }, 750);
  }, []);

  // Trigger Center Play/Pause Ripple Animation
  const triggerCenterAnimation = (type: "play" | "pause") => {
    if (centerTimer.current) clearTimeout(centerTimer.current);
    setCenterAnimation(type);
    centerTimer.current = setTimeout(() => {
      setCenterAnimation(null);
    }, 600);
  };

  // 1. Fetch Subscription Access Permissions
  const checkAccess = useCallback(async () => {
    if (!video?._id) return;
    try {
      const url = user?._id
        ? `/video/access/${video._id}?userId=${user._id}`
        : `/video/access/${video._id}`;
      const res = await axiosInstance.get(url);
      if (res.data?.success) {
        setAccessData(res.data);
        if (res.data.hasFullAccess) {
          setIsPaywalled(false);
        }
      }
    } catch (err) {
      console.log("Could not check video access:", err);
    }
  }, [video?._id, user?._id]);

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  // Set initial quality based on tier
  useEffect(() => {
    if (userRank >= 3) setSelectedQuality("4K");
    else if (userRank >= 2) setSelectedQuality("1080p");
    else if (userRank >= 1) setSelectedQuality("720p");
    else setSelectedQuality("480p");
  }, [userRank]);

  // 2. Prevent Multiple Videos Playing Simultaneously (Global Broadcast Channel)
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel("yourtube_playback_sync");
      channel.onmessage = (event) => {
        if (event.data?.action === "play" && event.data?.videoId !== video?._id) {
          if (videoRef.current && !videoRef.current.paused) {
            videoRef.current.pause();
            setIsPlaying(false);
            showFeedback(Pause, "Paused (Active in another tab)");
          }
        }
      };
    } catch (e) {
      console.log("BroadcastChannel not supported in environment:", e);
    }

    return () => {
      channel?.close();
    };
  }, [video?._id, showFeedback]);

  // Broadcast when this video starts playing
  const broadcastPlayback = () => {
    try {
      const channel = new BroadcastChannel("yourtube_playback_sync");
      channel.postMessage({ action: "play", videoId: video?._id });
      channel.close();
    } catch {}
  };

  // 3. Auto-Resume from Last Watched Position
  useEffect(() => {
    hasAutoResumed.current = false;
    setResumedFrom(null);

    const loadProgress = async () => {
      if (!video?._id) return;
      let resumeSec = 0;

      // Check localStorage first
      try {
        const savedLocal = localStorage.getItem(`yt_progress_${video._id}`);
        if (savedLocal) {
          resumeSec = parseFloat(savedLocal);
        }
      } catch {}

      // Check backend progress if user logged in
      if (user?._id) {
        try {
          const res = await axiosInstance.get(
            `/history/progress/${video._id}?userId=${user._id}`
          );
          if (res.data?.progress && res.data.progress > resumeSec) {
            resumeSec = res.data.progress;
          }
        } catch {}
      }

      // If user watched more than 5 seconds and video not finished
      if (resumeSec > 5) {
        setResumedFrom(resumeSec);
      }
    };

    loadProgress();
  }, [video?._id, user?._id]);

  // Apply Resume once metadata is ready
  const applyResumeTime = () => {
    if (!hasAutoResumed.current && resumedFrom && videoRef.current) {
      if (resumedFrom < (videoRef.current.duration || 99999) * 0.95) {
        videoRef.current.currentTime = resumedFrom;
        setCurrentTime(resumedFrom);
        showFeedback(RotateCw, `Resumed at ${formatTime(resumedFrom)}`);
      }
      hasAutoResumed.current = true;
    }
  };

  // 4. Save Watch Progress Periodically
  const saveProgress = useCallback(
    async (time: number, isFinished = false) => {
      if (!video?._id || !duration) return;

      // Local storage backup
      try {
        localStorage.setItem(`yt_progress_${video._id}`, String(time));
      } catch {}

      // Backend history save
      if (user?._id) {
        const percent = Math.min(100, Math.round((time / duration) * 100));
        try {
          await axiosInstance.post(`/history/progress/${video._id}`, {
            userId: user._id,
            progressSec: time,
            percentage: percent,
            completionThreshold: 90,
          });
        } catch {}
      }
    },
    [video?._id, duration, user?._id]
  );

  // Save progress every 5 seconds while playing
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      if (videoRef.current) {
        const now = videoRef.current.currentTime;
        if (Math.abs(now - lastSavedTime.current) >= 4) {
          lastSavedTime.current = now;
          saveProgress(now);
        }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isPlaying, saveProgress]);

  // 5. Autoplay Next Video Countdown Handlers
  const startAutoplayCountdown = useCallback(() => {
    if (!isAutoplayEnabled || !nextVideo) return;
    setAutoplayCountdown(5);

    if (autoplayTimer.current) clearInterval(autoplayTimer.current);

    autoplayTimer.current = setInterval(() => {
      setAutoplayCountdown((prev) => {
        if (prev === null || prev <= 1) {
          if (autoplayTimer.current) clearInterval(autoplayTimer.current);
          if (onNextVideo) {
            onNextVideo();
          } else if (nextVideo?._id) {
            router.push(`/watch/${nextVideo._id}`);
          }
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, [isAutoplayEnabled, nextVideo, onNextVideo, router]);

  const cancelAutoplayCountdown = () => {
    if (autoplayTimer.current) clearInterval(autoplayTimer.current);
    setAutoplayCountdown(null);
    showFeedback(X, "Autoplay cancelled");
  };

  // 6. Play / Pause Control
  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v || isPaywalled) return;

    if (v.paused) {
      v.play()
        .then(() => {
          setIsPlaying(true);
          triggerCenterAnimation("play");
          broadcastPlayback();
          if (autoplayCountdown !== null) cancelAutoplayCountdown();
        })
        .catch(() => {});
    } else {
      v.pause();
      setIsPlaying(false);
      triggerCenterAnimation("pause");
      if (videoRef.current) {
        saveProgress(videoRef.current.currentTime);
      }
    }
  }, [isPaywalled, autoplayCountdown, saveProgress]);

  // 7. Seek & Skip Controls
  const seekRelative = useCallback(
    (seconds: number) => {
      const v = videoRef.current;
      if (!v || isPaywalled) return;
      const target = Math.max(0, Math.min(v.duration || 0, v.currentTime + seconds));
      v.currentTime = target;
      setCurrentTime(target);
      showFeedback(seconds > 0 ? RotateCw : RotateCcw, `${seconds > 0 ? "+" : ""}${seconds}s`);
    },
    [isPaywalled, showFeedback]
  );

  const seekToPercent = useCallback(
    (percent: number) => {
      const v = videoRef.current;
      if (!v || isPaywalled || !v.duration) return;
      const target = v.duration * (percent / 100);
      v.currentTime = target;
      setCurrentTime(target);
      showFeedback(RotateCw, `${percent}%`);
    },
    [isPaywalled, showFeedback]
  );

  // 8. Volume Controls
  const handleVolumeChange = (newVol: number) => {
    const v = videoRef.current;
    if (!v) return;
    const clamped = Math.max(0, Math.min(1, newVol));
    v.volume = clamped;
    setVolume(clamped);
    if (clamped === 0) {
      v.muted = true;
      setIsMuted(true);
    } else if (v.muted) {
      v.muted = false;
      setIsMuted(false);
    }
  };

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const targetMuted = !v.muted;
    v.muted = targetMuted;
    setIsMuted(targetMuted);
    showFeedback(targetMuted ? VolumeX : Volume2, targetMuted ? "Mute" : "Unmute");
  }, [showFeedback]);

  // 9. Speed Control
  const changeSpeed = (speed: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = speed;
    setPlaybackSpeed(speed);
    setIsSettingsOpen(false);
    showFeedback(Settings, `Speed: ${speed}×`);
  };

  // 10. Fullscreen & PiP Controls
  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
      showFeedback(Maximize, "Full screen");
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
      showFeedback(Minimize, "Exit full screen");
    }
  }, [showFeedback]);

  const togglePiP = useCallback(async () => {
    const v = videoRef.current;
    if (!v) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPiPActive(false);
      } else if (document.pictureInPictureEnabled) {
        await v.requestPictureInPicture();
        setIsPiPActive(true);
        showFeedback(PictureInPicture2, "Picture in picture");
      }
    } catch (e) {
      toast.info("Picture-in-Picture not supported on this browser.");
    }
  }, [showFeedback]);

  // 11. Timeline Hover Preview Frame Generation
  const handleTimelineMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !duration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetTime = percent * duration;

    setHoverPosition(percent * 100);
    setHoverTime(targetTime);
    setIsHoveringTimeline(true);

    // Update secondary preview video & render frame to canvas
    if (previewVideoRef.current && previewCanvasRef.current) {
      previewVideoRef.current.currentTime = targetTime;
      const ctx = previewCanvasRef.current.getContext("2d");
      if (ctx) {
        ctx.drawImage(previewVideoRef.current, 0, 0, 160, 90);
      }
    }
  };

  const handleTimelineScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !duration || isPaywalled) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const target = percent * duration;
    if (videoRef.current) {
      videoRef.current.currentTime = target;
      setCurrentTime(target);
    }
  };

  // 12. Auto-Hiding Controls on Mouse Inactivity
  const resetControlsTimer = useCallback(() => {
    setControlsVisible(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);

    if (isPlaying) {
      hideControlsTimer.current = setTimeout(() => {
        if (!isSettingsOpen) {
          setControlsVisible(false);
        }
      }, 2800);
    }
  }, [isPlaying, isSettingsOpen]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // 13. Desktop Keyboard Shortcuts
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

      resetControlsTimer();
      const v = videoRef.current;
      if (!v) return;

      switch (e.key.toLowerCase()) {
        case " ":
        case "k": {
          e.preventDefault();
          togglePlay();
          break;
        }
        case "arrowleft": {
          e.preventDefault();
          if (e.shiftKey) {
            seekRelative(-30);
          } else {
            seekRelative(-10);
          }
          break;
        }
        case "j": {
          e.preventDefault();
          seekRelative(-10);
          break;
        }
        case "arrowright": {
          e.preventDefault();
          if (e.shiftKey) {
            seekRelative(30);
          } else {
            seekRelative(10);
          }
          break;
        }
        case "l": {
          e.preventDefault();
          seekRelative(10);
          break;
        }
        case "arrowup": {
          e.preventDefault();
          handleVolumeChange(volume + 0.1);
          showFeedback(Volume2, `${Math.round(Math.min(1, volume + 0.1) * 100)}%`);
          break;
        }
        case "arrowdown": {
          e.preventDefault();
          handleVolumeChange(volume - 0.1);
          showFeedback(Volume1, `${Math.round(Math.max(0, volume - 0.1) * 100)}%`);
          break;
        }
        case "m": {
          e.preventDefault();
          toggleMute();
          break;
        }
        case "f": {
          e.preventDefault();
          toggleFullscreen();
          break;
        }
        case "t": {
          e.preventDefault();
          if (onToggleTheaterMode) {
            onToggleTheaterMode();
            showFeedback(Tv, isTheaterMode ? "Default view" : "Theater mode");
          }
          break;
        }
        case "i":
        case "p": {
          e.preventDefault();
          togglePiP();
          break;
        }
        case "c": {
          e.preventDefault();
          setCaptionsEnabled((prev) => {
            showFeedback(Subtitles, !prev ? "Subtitles on" : "Subtitles off");
            return !prev;
          });
          break;
        }
        case "<":
        case ",": {
          if (e.shiftKey || e.key === "<") {
            e.preventDefault();
            const currIdx = PLAYBACK_SPEEDS.indexOf(playbackSpeed);
            if (currIdx > 0) changeSpeed(PLAYBACK_SPEEDS[currIdx - 1]);
          }
          break;
        }
        case ">":
        case ".": {
          if (e.shiftKey || e.key === ">") {
            e.preventDefault();
            const currIdx = PLAYBACK_SPEEDS.indexOf(playbackSpeed);
            if (currIdx < PLAYBACK_SPEEDS.length - 1) changeSpeed(PLAYBACK_SPEEDS[currIdx + 1]);
          }
          break;
        }
        case "n": {
          if (e.shiftKey || e.key === "n") {
            e.preventDefault();
            if (nextVideo) {
              if (onNextVideo) onNextVideo();
              else router.push(`/watch/${nextVideo._id}`);
            }
          }
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
          seekToPercent(parseInt(e.key, 10) * 10);
          break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    togglePlay,
    seekRelative,
    seekToPercent,
    volume,
    playbackSpeed,
    toggleMute,
    toggleFullscreen,
    togglePiP,
    isTheaterMode,
    onToggleTheaterMode,
    nextVideo,
    onNextVideo,
    router,
    resetControlsTimer,
  ]);

  // 14. Video Event Handlers
  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;

    setCurrentTime(v.currentTime);

    // Buffering calculations
    if (v.buffered && v.buffered.length > 0 && v.duration) {
      const buffEnd = v.buffered.end(v.buffered.length - 1);
      setBufferedPercent(Math.min(100, (buffEnd / v.duration) * 100));
    }

    // Subscription Watch Time Restrictions
    if (accessData && !accessData.hasFullAccess && accessData.previewDurationSec > 0) {
      if (v.currentTime >= accessData.previewDurationSec) {
        v.pause();
        setIsPlaying(false);
        setIsPaywalled(true);
      }
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    saveProgress(duration, true);
    startAutoplayCountdown();
  };

  const handleSelectQuality = (level: (typeof QUALITY_LEVELS)[0]) => {
    if (userRank < level.rank) {
      toast.info(
        `${level.label} streaming requires ${level.requiredTier} membership. Upgrade to unlock HD/4K quality.`
      );
      setIsPlanModalOpen(true);
      return;
    }
    setSelectedQuality(level.id);
    setIsSettingsOpen(false);
    showFeedback(Settings, `Quality: ${level.label}`);
  };

  const playedPercent = duration ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={resetControlsTimer}
      onMouseLeave={() => {
        setIsHoveringTimeline(false);
        if (isPlaying) setControlsVisible(false);
      }}
      className={`relative bg-black rounded-2xl overflow-hidden shadow-2xl select-none group transition-all duration-300 ${
        isTheaterMode ? "w-full max-h-[80vh] aspect-[16/9] md:aspect-[21/9]" : "w-full aspect-video"
      } ${!controlsVisible && isFullscreen ? "cursor-none" : ""}`}
    >
      {/* Primary Video Element (Custom Controls Only) */}
      <video
        ref={videoRef}
        src={videoSrc}
        className="w-full h-full object-contain cursor-pointer"
        controls={false}
        autoPlay
        playsInline
        preload="metadata"
        onClick={togglePlay}
        onLoadedMetadata={(e) => {
          setDuration(e.currentTarget.duration);
          applyResumeTime();
        }}
        onTimeUpdate={handleTimeUpdate}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => {
          setIsBuffering(false);
          setIsPlaying(true);
        }}
        onPause={() => setIsPlaying(false)}
        onEnded={handleEnded}
        onError={() => setHasError(true)}
      />

      {/* Hidden Secondary Video for Accurate Hover Frame Preview Scrubbing */}
      <video
        ref={previewVideoRef}
        src={videoSrc}
        preload="metadata"
        muted
        className="hidden"
        onSeeked={() => {
          if (previewVideoRef.current && previewCanvasRef.current) {
            const ctx = previewCanvasRef.current.getContext("2d");
            ctx?.drawImage(previewVideoRef.current, 0, 0, 160, 90);
          }
        }}
      />

      {/* Center Buffering Spinner Indicator */}
      {isBuffering && !isPaywalled && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-20">
          <Loader2 className="w-14 h-14 text-red-600 animate-spin opacity-90 drop-shadow-lg" />
        </div>
      )}

      {/* Big Animated Center Play/Pause Ripple Indicator */}
      {centerAnimation && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-20">
          <div className="w-20 h-20 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur-md animate-out zoom-out-125 fade-out duration-500 shadow-2xl">
            {centerAnimation === "play" ? (
              <Play className="w-10 h-10 fill-white ml-1" />
            ) : (
              <Pause className="w-10 h-10 fill-white" />
            )}
          </div>
        </div>
      )}

      {/* Floating HUD Feedback Badge (Shortcuts & Audio Indicator) */}
      {feedback && (
        <div className="pointer-events-none absolute top-6 inset-x-0 flex justify-center z-30">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/80 text-white backdrop-blur-md shadow-2xl text-xs font-bold border border-white/10 animate-in fade-in zoom-in-95 duration-150">
            <feedback.icon className="w-4 h-4 text-red-500" />
            <span>{feedback.text}</span>
          </div>
        </div>
      )}

      {/* Dynamic Subtitles / Closed Captions Overlay */}
      {captionsEnabled && isPlaying && !isPaywalled && (
        <div className="pointer-events-none absolute bottom-16 inset-x-0 flex justify-center z-20 px-4">
          <div className="bg-black/85 text-white font-medium text-xs sm:text-sm px-3.5 py-1.5 rounded-md backdrop-blur-xs text-center max-w-xl shadow-lg border border-white/10">
            {video?.videotitle || "Audio stream playback active"}
          </div>
        </div>
      )}

      {/* Top Overlay Badges: Course / Premium / Ad-Free VIP */}
      <div
        className={`absolute top-4 left-4 flex items-center gap-2 z-20 transition-opacity duration-300 ${
          controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {video?.isCourse ? (
          <span className="px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-gradient-to-r from-yellow-400 to-amber-500 text-black shadow-lg flex items-center gap-1">
            <Crown className="w-3.5 h-3.5" /> Exclusive Course
          </span>
        ) : video?.isPremium ? (
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-red-600 text-white shadow-lg flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" /> Premium Video
          </span>
        ) : null}

        {userRank >= 2 && (
          <span className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-black/60 text-emerald-400 backdrop-blur-md border border-emerald-500/30">
            <ShieldCheck className="w-3.5 h-3.5" /> Ad-Free VIP
          </span>
        )}
      </div>

      {/* Autoplay Next Video Countdown Overlay */}
      {autoplayCountdown !== null && nextVideo && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6 text-white text-center animate-in fade-in">
          <div className="relative w-20 h-20 mb-4 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90">
              <circle
                cx="40"
                cy="40"
                r="34"
                className="stroke-neutral-700 fill-none stroke-[5]"
              />
              <circle
                cx="40"
                cy="40"
                r="34"
                className="stroke-red-600 fill-none stroke-[5] transition-all duration-1000 ease-linear"
                style={{
                  strokeDasharray: 213,
                  strokeDashoffset: (213 * (5 - autoplayCountdown)) / 5,
                }}
              />
            </svg>
            <span className="absolute font-black text-2xl">{autoplayCountdown}</span>
          </div>

          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-1">
            Up Next In {autoplayCountdown} Seconds
          </p>
          <h4 className="text-lg sm:text-xl font-bold max-w-md line-clamp-2 mb-6">
            {nextVideo.videotitle}
          </h4>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={cancelAutoplayCountdown}
              className="border-neutral-600 text-white hover:bg-neutral-800 rounded-xl px-5 text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                cancelAutoplayCountdown();
                if (onNextVideo) onNextVideo();
                else router.push(`/watch/${nextVideo._id}`);
              }}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-6 text-xs font-bold shadow-lg"
            >
              Play Now
            </Button>
          </div>
        </div>
      )}

      {/* Paywall Overlay for Subscription Enforcement */}
      {isPaywalled && (
        <div className="absolute inset-0 bg-neutral-950/95 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6 text-center text-white animate-in fade-in">
          <div className="p-4 rounded-3xl bg-red-600/20 border border-red-500/40 mb-3 text-red-500 shadow-xl">
            <Lock className="w-10 h-10" />
          </div>
          <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold uppercase tracking-wider mb-2">
            Free Preview Concluded
          </span>
          <h3 className="text-xl sm:text-2xl font-extrabold max-w-md">
            Unlock Unlimited Full Playback
          </h3>
          <p className="text-xs sm:text-sm text-gray-300 max-w-lg mt-2 leading-relaxed">
            {accessData?.reason ||
              "This premium content requires a paid membership. Upgrade to Bronze, Silver, or Gold to enjoy unlimited streaming, HD/4K resolution, and ad-free viewing."}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            <Button
              onClick={() => setIsPlanModalOpen(true)}
              className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm px-6 py-2.5 rounded-xl shadow-lg"
            >
              <Sparkles className="w-4 h-4 mr-1.5 text-yellow-300" /> Upgrade with Razorpay
            </Button>
            <Link href="/membership">
              <Button
                variant="outline"
                className="text-xs sm:text-sm px-5 py-2.5 rounded-xl border-neutral-700 text-gray-200 hover:bg-neutral-800"
              >
                Compare Plans
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Resume from last watched notification pill */}
      {resumedFrom && !hasAutoResumed.current && (
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-neutral-900/90 text-white px-3 py-1.5 rounded-xl border border-neutral-700 text-xs backdrop-blur-md shadow-xl animate-in fade-in">
          <span>Resumed from {formatTime(resumedFrom)}</span>
          <button
            onClick={() => {
              if (videoRef.current) {
                videoRef.current.currentTime = 0;
                setCurrentTime(0);
                showFeedback(RotateCcw, "Started over");
              }
              setResumedFrom(null);
            }}
            className="text-red-400 hover:text-red-300 font-bold ml-1 underline text-[11px]"
          >
            Start over
          </button>
        </div>
      )}

      {/* CUSTOM CONTROLS OVERLAY BAR */}
      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent pt-12 pb-2 px-3 sm:px-4 z-20 flex flex-col justify-end transition-opacity duration-300 ${
          controlsVisible && !isPaywalled
            ? "opacity-100"
            : "opacity-0 pointer-events-none"
        }`}
      >
        {/* TIMELINE PROGRESS BAR WITH HOVER PREVIEW */}
        <div
          ref={progressBarRef}
          onMouseMove={handleTimelineMouseMove}
          onMouseEnter={() => setIsHoveringTimeline(true)}
          onMouseLeave={() => setIsHoveringTimeline(false)}
          onClick={handleTimelineScrub}
          className="relative h-2 hover:h-3.5 w-full bg-neutral-700/60 rounded-full cursor-pointer transition-all mb-2 group/timeline flex items-center"
        >
          {/* Buffering Range Bar */}
          <div
            className="absolute left-0 top-0 bottom-0 bg-neutral-500/70 rounded-full pointer-events-none transition-all"
            style={{ width: `${bufferedPercent}%` }}
          />

          {/* Current Played Progress Bar */}
          <div
            className="absolute left-0 top-0 bottom-0 bg-red-600 rounded-full pointer-events-none transition-all"
            style={{ width: `${playedPercent}%` }}
          />

          {/* Scrubber Knob / Handle */}
          <div
            className="absolute w-3.5 h-3.5 bg-red-600 rounded-full -translate-x-1/2 scale-0 group-hover/timeline:scale-100 transition-transform shadow-md pointer-events-none"
            style={{ left: `${playedPercent}%` }}
          />

          {/* Hover Preview Tooltip Box (Video Frame Preview Canvas + Timestamp) */}
          {isHoveringTimeline && (
            <div
              className="absolute bottom-6 -translate-x-1/2 pointer-events-none flex flex-col items-center z-30 transition-all duration-75"
              style={{
                left: `${Math.max(12, Math.min(88, hoverPosition))}%`,
              }}
            >
              <div className="p-1 rounded-xl bg-neutral-900 border border-neutral-700 shadow-2xl overflow-hidden flex flex-col items-center">
                {/* 160x90 Canvas Preview Frame */}
                <canvas
                  ref={previewCanvasRef}
                  width="160"
                  height="90"
                  className="rounded-lg bg-black w-[140px] sm:w-[160px] aspect-video object-cover"
                />
                <span className="text-[11px] font-mono font-bold text-white mt-1 px-2 py-0.5 rounded bg-black/80">
                  {formatTime(hoverTime)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* CONTROLS ROW */}
        <div className="flex items-center justify-between text-white text-xs sm:text-sm">
          {/* Left Group: Play/Pause, Skip -10s, Skip +10s, Next, Volume, Time */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Play / Pause Toggle */}
            <button
              type="button"
              onClick={togglePlay}
              className="p-1.5 sm:p-2 rounded-full hover:bg-white/20 transition-colors"
              title={isPlaying ? "Pause (k / space)" : "Play (k / space)"}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-white" />
              ) : (
                <Play className="w-5 h-5 fill-white ml-0.5" />
              )}
            </button>

            {/* Seek -10s */}
            <button
              type="button"
              onClick={() => seekRelative(-10)}
              className="p-1.5 sm:p-2 rounded-full hover:bg-white/20 transition-colors hidden xs:inline-flex"
              title="Seek backward 10 seconds (j / Left Arrow)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Seek +10s */}
            <button
              type="button"
              onClick={() => seekRelative(10)}
              className="p-1.5 sm:p-2 rounded-full hover:bg-white/20 transition-colors hidden xs:inline-flex"
              title="Seek forward 10 seconds (l / Right Arrow)"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Next Video Button */}
            {nextVideo && (
              <button
                type="button"
                onClick={() => {
                  if (onNextVideo) onNextVideo();
                  else router.push(`/watch/${nextVideo._id}`);
                }}
                className="p-1.5 sm:p-2 rounded-full hover:bg-white/20 transition-colors"
                title={`Next: ${nextVideo.videotitle} (Shift+N)`}
              >
                <SkipForward className="w-4 h-4" />
              </button>
            )}

            {/* Volume Control Group with Draggable Slider */}
            <div
              onMouseEnter={() => setIsVolumeHovered(true)}
              onMouseLeave={() => setIsVolumeHovered(false)}
              className="flex items-center group/volume"
            >
              <button
                type="button"
                onClick={toggleMute}
                className="p-1.5 sm:p-2 rounded-full hover:bg-white/20 transition-colors"
                title={isMuted ? "Unmute (m)" : "Mute (m)"}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5 text-red-500" />
                ) : volume < 0.5 ? (
                  <Volume1 className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>

              {/* Volume Slider Bar (Expands on Hover) */}
              <div
                className={`transition-all duration-200 overflow-hidden flex items-center ${
                  isVolumeHovered ? "w-16 sm:w-20 opacity-100 ml-1" : "w-0 opacity-0"
                }`}
              >
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-neutral-600 accent-red-600 rounded-lg cursor-pointer"
                  title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
                />
              </div>
            </div>

            {/* Time Display (Current / Total or Remaining) */}
            <button
              type="button"
              onClick={() => setShowRemainingTime(!showRemainingTime)}
              className="px-2 py-1 rounded hover:bg-white/10 text-xs font-mono text-neutral-300 transition-colors"
              title="Click to toggle Total vs Remaining time"
            >
              <span>{formatTime(currentTime)}</span>
              <span className="mx-1 text-neutral-500">/</span>
              <span>
                {showRemainingTime
                  ? `-${formatTime(Math.max(0, duration - currentTime))}`
                  : formatTime(duration)}
              </span>
            </button>
          </div>

          {/* Right Group: Autoplay Toggle, Subtitles, Settings, PiP, Theater, Fullscreen */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* Autoplay Toggle Switch */}
            <button
              type="button"
              onClick={() => {
                setIsAutoplayEnabled(!isAutoplayEnabled);
                showFeedback(
                  Play,
                  !isAutoplayEnabled ? "Autoplay enabled" : "Autoplay disabled"
                );
              }}
              className={`p-1.5 sm:p-2 rounded-full transition-colors hidden sm:inline-flex ${
                isAutoplayEnabled ? "text-white hover:bg-white/20" : "text-neutral-500 hover:bg-white/10"
              }`}
              title={isAutoplayEnabled ? "Autoplay is on" : "Autoplay is off"}
            >
              <div className="flex items-center gap-1 text-[11px] font-bold">
                <span>AUTO</span>
              </div>
            </button>

            {/* Subtitles / Captions Button */}
            <button
              type="button"
              onClick={() => {
                setCaptionsEnabled(!captionsEnabled);
                showFeedback(Subtitles, !captionsEnabled ? "Subtitles on" : "Subtitles off");
              }}
              className={`p-1.5 sm:p-2 rounded-full transition-colors ${
                captionsEnabled
                  ? "text-red-500 hover:bg-red-500/20"
                  : "text-white hover:bg-white/20"
              }`}
              title="Subtitles/Closed Captions (c)"
            >
              <Subtitles className="w-4 h-4" />
            </button>

            {/* Settings & Quality Menu Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsSettingsOpen(!isSettingsOpen);
                  setSettingsTab("main");
                }}
                className={`p-1.5 sm:p-2 rounded-full hover:bg-white/20 transition-colors ${
                  isSettingsOpen ? "bg-white/20" : ""
                }`}
                title="Settings & Playback Speed"
              >
                <Settings className="w-4 h-4" />
              </button>

              {/* Settings Dropdown Box */}
              {isSettingsOpen && (
                <div className="absolute right-0 bottom-10 w-52 rounded-2xl bg-neutral-900/95 text-white border border-neutral-700 shadow-2xl p-2 z-40 backdrop-blur-xl animate-in fade-in zoom-in-95">
                  {settingsTab === "main" ? (
                    <div className="space-y-1">
                      {/* Playback Speed Item */}
                      <button
                        type="button"
                        onClick={() => setSettingsTab("speed")}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs hover:bg-neutral-800 transition-colors text-left"
                      >
                        <span className="font-semibold text-neutral-300">Playback speed</span>
                        <span className="flex items-center gap-1 text-neutral-400">
                          {playbackSpeed === 1 ? "Normal" : `${playbackSpeed}×`}
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </button>

                      {/* Quality Item */}
                      <button
                        type="button"
                        onClick={() => setSettingsTab("quality")}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs hover:bg-neutral-800 transition-colors text-left"
                      >
                        <span className="font-semibold text-neutral-300">Quality</span>
                        <span className="flex items-center gap-1 text-neutral-400">
                          {selectedQuality}
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </button>
                    </div>
                  ) : settingsTab === "speed" ? (
                    <div>
                      <button
                        type="button"
                        onClick={() => setSettingsTab("main")}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-neutral-400 hover:text-white mb-1"
                      >
                        ← Back
                      </button>
                      <div className="space-y-0.5 max-h-48 overflow-y-auto">
                        {PLAYBACK_SPEEDS.map((spd) => (
                          <button
                            key={spd}
                            type="button"
                            onClick={() => changeSpeed(spd)}
                            className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs ${
                              playbackSpeed === spd
                                ? "bg-red-600 text-white font-bold"
                                : "hover:bg-neutral-800 text-neutral-300"
                            }`}
                          >
                            <span>{spd === 1 ? "Normal" : `${spd}×`}</span>
                            {playbackSpeed === spd && <Check className="w-3.5 h-3.5" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <button
                        type="button"
                        onClick={() => setSettingsTab("main")}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-neutral-400 hover:text-white mb-1"
                      >
                        ← Back
                      </button>
                      <div className="space-y-0.5">
                        {QUALITY_LEVELS.map((lvl) => {
                          const isLocked = userRank < lvl.rank;
                          const isSelected = selectedQuality === lvl.id;
                          return (
                            <button
                              key={lvl.id}
                              type="button"
                              onClick={() => handleSelectQuality(lvl)}
                              className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs ${
                                isSelected
                                  ? "bg-red-600 text-white font-bold"
                                  : "hover:bg-neutral-800 text-neutral-300"
                              }`}
                            >
                              <span>{lvl.label}</span>
                              {isLocked ? (
                                <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800">
                                  <Lock className="w-2.5 h-2.5" /> {lvl.requiredTier}
                                </span>
                              ) : isSelected ? (
                                <Check className="w-3.5 h-3.5" />
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Picture-in-Picture Button */}
            <button
              type="button"
              onClick={togglePiP}
              className="p-1.5 sm:p-2 rounded-full hover:bg-white/20 transition-colors hidden sm:inline-flex"
              title="Picture in Picture (i / p)"
            >
              <PictureInPicture2 className="w-4 h-4" />
            </button>

            {/* Theater Mode Button */}
            {onToggleTheaterMode && (
              <button
                type="button"
                onClick={onToggleTheaterMode}
                className="p-1.5 sm:p-2 rounded-full hover:bg-white/20 transition-colors hidden md:inline-flex"
                title={isTheaterMode ? "Default view (t)" : "Theater mode (t)"}
              >
                <Tv className={`w-4 h-4 ${isTheaterMode ? "text-red-500" : ""}`} />
              </button>
            )}

            {/* Fullscreen Button */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1.5 sm:p-2 rounded-full hover:bg-white/20 transition-colors"
              title={isFullscreen ? "Exit Full Screen (f)" : "Full Screen (f)"}
            >
              {isFullscreen ? (
                <Minimize className="w-4 h-4" />
              ) : (
                <Maximize className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Subscription Plan Modal for Upgrades */}
      <SubscriptionPlanModal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        currentPlan={userPlan}
        onPlanUpdated={async () => {
          if (refreshUser) await refreshUser();
          await checkAccess();
          setIsPaywalled(false);
          if (videoRef.current) {
            videoRef.current.play().catch(() => {});
          }
        }}
      />
    </div>
  );
}
