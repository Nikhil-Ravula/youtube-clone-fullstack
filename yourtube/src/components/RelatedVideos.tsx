import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface RelatedVideosProps {
  videos: Array<{
    _id: string;
    videotitle: string;
    videochanel: string;
    filepath?: string;
    views: number;
    createdAt: string;
  }>;
}

export default function RelatedVideos({ videos }: RelatedVideosProps) {
  if (!videos || videos.length === 0) {
    return (
      <div className="text-sm text-gray-500 py-4 text-center">
        No other videos available.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm text-gray-900 mb-2">Related Videos</h3>
      {videos.map((video) => {
        const backendUrl =
          process.env.NEXT_PUBLIC_BACKEND_URL ||
          process.env.BACKEND_URL ||
          "http://localhost:5000";
        const cleanPath = video.filepath?.replace(/\\/g, "/");
        const videoSrc = cleanPath
          ? cleanPath.startsWith("http")
            ? cleanPath
            : `${backendUrl}/${cleanPath}`
          : "";

        return (
          <Link
            key={video._id}
            href={`/watch/${video._id}`}
            className="flex gap-2 group"
          >
            <div className="relative w-40 aspect-video bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
              <video
                src={videoSrc}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm line-clamp-2 group-hover:text-blue-600 leading-snug">
                {video.videotitle}
              </h4>
              <p className="text-xs text-gray-600 mt-1 truncate">{video.videochanel}</p>
              <p className="text-xs text-gray-500">
                {video.views?.toLocaleString() || 0} views •{" "}
                {video.createdAt
                  ? `${formatDistanceToNow(new Date(video.createdAt))} ago`
                  : "Recently"}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

