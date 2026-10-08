"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { useRef, useState } from "react";
import { getMediaUrl } from "@/lib/mediaUrl";

export default function VideoCard({ video }: any) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    setIsHovered(true);
    hoverTimeoutRef.current = setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
      }
    }, 250);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  const videoSrc = getMediaUrl(video?.filepath);

  return (
    <div
      className="space-y-3 group cursor-pointer"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link href={`/watch/${video?._id}`} className="block">
        <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 shadow-xs">
          <video
            ref={videoRef}
            src={videoSrc}
            muted
            playsInline
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[11px] font-medium px-1.5 py-0.5 rounded">
            {isHovered ? "Previewing" : "HD"}
          </div>
        </div>
      </Link>

      <div className="flex gap-3 items-start">
        <Link
          href={video?.uploader ? `/channel/${video.uploader}` : "#"}
          className="flex-shrink-0 mt-0.5"
          onClick={(e) => {
            if (!video?.uploader) e.preventDefault();
          }}
        >
          <Avatar className="w-9 h-9">
            <AvatarFallback className="bg-gray-200 text-gray-800 text-xs font-semibold">
              {video?.videochanel?.[0]?.toUpperCase() || "C"}
            </AvatarFallback>
          </Avatar>
        </Link>

        <div className="flex-1 min-w-0">
          <Link href={`/watch/${video?._id}`}>
            <h3 className="font-medium text-sm line-clamp-2 leading-snug group-hover:text-blue-600 text-gray-900">
              {video?.videotitle}
            </h3>
          </Link>
          <Link
            href={video?.uploader ? `/channel/${video.uploader}` : "#"}
            className="text-xs text-gray-600 hover:text-black mt-1 block truncate"
          >
            {video?.videochanel}
          </Link>
          <p className="text-xs text-gray-500 mt-0.5">
            {video?.views?.toLocaleString() || 0} views •{" "}
            {video?.createdAt
              ? `${formatDistanceToNow(new Date(video.createdAt))} ago`
              : "Recently"}
          </p>
        </div>
      </div>
    </div>
  );
}

