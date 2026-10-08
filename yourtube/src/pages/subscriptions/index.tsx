import React, { useEffect, useState } from "react";
import Videocard from "@/components/videocard";
import axiosInstance from "@/lib/axiosinstance";
import { useUser } from "@/lib/AuthContext";
import { PlaySquare, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function SubscriptionsPage() {
  const { user, handlegooglesignin } = useUser();
  const [videos, setVideos] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideosAndSubs = async () => {
      try {
        const [videoRes, subsRes] = await Promise.all([
          axiosInstance.get("/video/getall"),
          user?._id
            ? axiosInstance.get(`/subscription/user/${user._id}`).catch(() => ({ data: [] }))
            : Promise.resolve({ data: [] }),
        ]);

        setVideos(videoRes.data || []);
        setSubscriptions(subsRes.data || []);
      } catch (error) {
        console.error("Error loading subscriptions videos:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchVideosAndSubs();
  }, [user?._id]);

  if (!user) {
    return (
      <main className="flex-1 p-3 sm:p-6">
        <div className="max-w-md mx-auto text-center py-16 space-y-4">
          <PlaySquare className="w-16 h-16 mx-auto text-gray-400" />
          <h2 className="text-xl font-semibold">Don't miss new videos</h2>
          <p className="text-sm text-gray-600">
            Sign in to see updates from your favorite YouTube channels.
          </p>
          <Button onClick={handlegooglesignin} className="bg-red-600 hover:bg-red-700 text-white font-medium">
            Sign In
          </Button>
        </div>
      </main>
    );
  }

  // Filter or group videos by subscribed channels
  const subscribedChannelIds = new Set(subscriptions.map((s) => s.channelId));
  const subscribedChannelNames = new Set(subscriptions.map((s) => s.channelName?.toLowerCase()));

  const subscribedVideos = videos.filter(
    (v) =>
      subscribedChannelIds.has(v.uploader) ||
      subscribedChannelNames.has(v.videochanel?.toLowerCase())
  );

  const displayVideos = subscribedVideos.length > 0 ? subscribedVideos : videos;

  return (
    <main className="flex-1 p-3 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Subscribed Channels Header Chips if any */}
        {subscriptions.length > 0 && (
          <div className="space-y-3 pb-2 border-b">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-red-600" />
              <span>Channels You Subscribe To ({subscriptions.length})</span>
            </h2>
            <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
              {subscriptions.map((sub) => (
                <Link
                  key={sub._id || sub.channelId}
                  href={`/channel/${sub.channelId}`}
                  className="flex flex-col items-center gap-1.5 min-w-[72px] group"
                >
                  <Avatar className="w-12 h-12 ring-2 ring-transparent group-hover:ring-red-600 transition-all shadow-sm">
                    <AvatarFallback className="bg-zinc-800 text-white font-semibold text-sm">
                      {sub.channelName?.[0]?.toUpperCase() || "C"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-[11px] font-medium text-gray-800 group-hover:text-red-600 truncate max-w-[72px] text-center">
                    {sub.channelName || "Channel"}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            {subscribedVideos.length > 0
              ? "Videos from Subscribed Channels"
              : "Latest Videos"}
          </h1>
          {subscribedVideos.length === 0 && subscriptions.length === 0 && (
            <p className="text-xs text-gray-500 hidden sm:block">
              Subscribe to channels to see their latest uploads here.
            </p>
          )}
        </div>

        {loading ? (
          <div className="text-gray-500 py-8 text-center">Loading subscriptions...</div>
        ) : displayVideos.length === 0 ? (
          <div className="text-gray-500 py-8 text-center">No videos uploaded yet.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {displayVideos.map((video) => (
              <Videocard key={video._id} video={video} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
