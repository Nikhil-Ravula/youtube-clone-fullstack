import React, { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import axiosInstance from "@/lib/axiosinstance";
import { getMediaUrl } from "@/lib/mediaUrl";

interface SearchResultProps {
  query: string;
}

const SearchResult = ({ query }: SearchResultProps) => {
  const [results, setResults] = useState<any[]>([]);
  const [matchingChannels, setMatchingChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAndSearch = async () => {
      if (!query || !query.trim()) {
        setResults([]);
        setMatchingChannels([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const res = await axiosInstance.get("/video/getall");
        const allVideos = res.data || [];
        const cleanQuery = query.toLowerCase().trim();

        // Filter videos matching title or channel
        const matchedVideos = allVideos.filter(
          (v: any) =>
            v.videotitle?.toLowerCase().includes(cleanQuery) ||
            v.videochanel?.toLowerCase().includes(cleanQuery)
        );
        setResults(matchedVideos);

        // Find unique channels matching the query
        const channelsMap = new Map();
        allVideos.forEach((v: any) => {
          if (
            v.videochanel?.toLowerCase().includes(cleanQuery) &&
            !channelsMap.has(v.videochanel)
          ) {
            channelsMap.set(v.videochanel, {
              channelname: v.videochanel,
              uploader: v.uploader,
            });
          }
        });
        setMatchingChannels(Array.from(channelsMap.values()));
      } catch (error) {
        console.error("Error searching videos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAndSearch();
  }, [query]);

  if (!query || !query.trim()) {
    return (
      <div className="text-center py-16 text-gray-500">
        Type something in the search bar above to find videos and channels.
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-16 text-gray-500">Searching videos...</div>;
  }

  if (results.length === 0 && matchingChannels.length === 0) {
    return (
      <div className="text-center py-16 space-y-2">
        <h2 className="text-xl font-semibold text-gray-800">No results found</h2>
        <p className="text-sm text-gray-500">
          Try different keywords or check for spelling errors.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Matching Channel Cards if any */}
      {matchingChannels.map((channel) => (
        <div
          key={channel.channelname}
          className="flex items-center gap-6 p-4 border-b pb-6"
        >
          <Link
            href={channel.uploader ? `/channel/${channel.uploader}` : "#"}
            className="flex-shrink-0"
          >
            <Avatar className="w-20 h-20 md:w-28 md:h-28">
              <AvatarFallback className="text-2xl font-bold bg-gray-200">
                {channel.channelname?.[0]?.toUpperCase() || "C"}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="space-y-1">
            <Link
              href={channel.uploader ? `/channel/${channel.uploader}` : "#"}
              className="text-lg font-semibold hover:text-blue-600 block"
            >
              {channel.channelname}
            </Link>
            <p className="text-xs text-gray-500">
              @{channel.channelname.toLowerCase().replace(/\s+/g, "")} • Channel
            </p>
          </div>
        </div>
      ))}

      {/* Video Results */}
      <div className="space-y-4">
        {results.map((video: any) => {
          const videoSrc = getMediaUrl(video?.filepath);
          return (
            <div
              key={video._id}
              className="flex flex-col sm:flex-row gap-4 group cursor-pointer"
            >
              <Link href={`/watch/${video._id}`} className="flex-shrink-0">
                <div className="relative w-full sm:w-72 md:w-80 aspect-video bg-gray-100 rounded-xl overflow-hidden shadow-xs">
                  <video
                    src={videoSrc}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[11px] font-medium px-1.5 py-0.5 rounded">
                    HD
                  </div>
                </div>
              </Link>

              <div className="flex-1 min-w-0 py-0.5">
                <Link href={`/watch/${video._id}`}>
                  <h3 className="font-medium text-base md:text-lg line-clamp-2 group-hover:text-blue-600 text-gray-900 leading-snug">
                    {video.videotitle}
                  </h3>
                </Link>

                <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                  <span>{video.views?.toLocaleString() || 0} views</span>
                  <span>•</span>
                  <span>
                    {video.createdAt
                      ? `${formatDistanceToNow(new Date(video.createdAt))} ago`
                      : "Recently"}
                  </span>
                </div>

                <Link
                  href={video.uploader ? `/channel/${video.uploader}` : "#"}
                  className="flex items-center gap-2 mt-3 hover:text-blue-600 w-fit"
                >
                  <Avatar className="w-6 h-6">
                    <AvatarFallback className="text-[10px] bg-gray-200">
                      {video.videochanel?.[0]?.toUpperCase() || "C"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium text-gray-700">
                    {video.videochanel}
                  </span>
                </Link>

                {video.description && (
                  <p className="text-xs text-gray-600 line-clamp-2 mt-2">
                    {video.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-center py-6 text-xs text-gray-400">
        Showing {results.length} result{results.length === 1 ? "" : "s"} for "{query}"
      </div>
    </div>
  );
};

export default SearchResult;

