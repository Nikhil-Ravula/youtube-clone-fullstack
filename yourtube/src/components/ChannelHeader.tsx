import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Check, Edit3 } from "lucide-react";
import { toast } from "sonner";
import axiosInstance from "@/lib/axiosinstance";
import { formatSubscribers } from "@/lib/formatSubscribers";

interface ChannelHeaderProps {
  channel: any;
  user: any;
  onEditChannel?: () => void;
  videoCount?: number;
}

const ChannelHeader = ({
  channel,
  user,
  onEditChannel,
  videoCount = 0,
}: ChannelHeaderProps) => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscribersCount, setSubscribersCount] = useState(0);

  const channelId = channel?._id || channel?.channelname || "";
  const subKey = `sub_${channelId}`;

  useEffect(() => {
    if (!channelId) return;

    const fetchStatus = async () => {
      try {
        const subscriberId = user?._id || user?.id || "";
        const url = subscriberId
          ? `/subscription/status/${channelId}?subscriberId=${subscriberId}`
          : `/subscription/status/${channelId}`;
        const res = await axiosInstance.get(url);
        if (res.data) {
          setSubscribersCount(res.data.count || 0);
          setIsSubscribed(!!res.data.isSubscribed);
        }
      } catch (err) {
        // Fallback to local storage
        const savedSub = localStorage.getItem(subKey);
        setIsSubscribed(savedSub === "true");
        setSubscribersCount(savedSub === "true" ? 1 : 0);
      }
    };

    fetchStatus();
  }, [channelId, user?._id, subKey]);

  const handleSubscribe = async () => {
    if (!user) {
      toast.info("Please sign in to subscribe");
      return;
    }

    const subscriberId = user?._id || user?.id;
    if (channelId === subscriberId) {
      toast.info("You cannot subscribe to your own channel");
      return;
    }

    try {
      const res = await axiosInstance.post("/subscription/toggle", {
        channelId,
        subscriberId,
        channelName: channel?.channelname || "Channel",
      });
      setIsSubscribed(res.data.isSubscribed);
      setSubscribersCount(res.data.count);
      if (res.data.isSubscribed) {
        toast.success(`Subscribed to ${channel?.channelname}!`);
      } else {
        toast.info(`Unsubscribed from ${channel?.channelname}`);
      }
    } catch {
      // Offline fallback
      if (isSubscribed) {
        setIsSubscribed(false);
        setSubscribersCount((prev) => Math.max(0, prev - 1));
        localStorage.removeItem(subKey);
        toast.info(`Unsubscribed from ${channel?.channelname}`);
      } else {
        setIsSubscribed(true);
        setSubscribersCount((prev) => prev + 1);
        localStorage.setItem(subKey, "true");
        toast.success(`Subscribed to ${channel?.channelname}!`);
      }
    }
  };

  const channelInitial = channel?.channelname?.[0]?.toUpperCase() || "C";
  const handleTag = channel?.channelname
    ? `@${channel.channelname.toLowerCase().replace(/\s+/g, "")}`
    : "@channel";

  const isOwner = user && channel && user?._id === channel?._id;

  return (
    <div className="w-full">
      {/* Banner */}
      <div className="relative h-32 md:h-44 lg:h-52 bg-gradient-to-r from-red-600 via-rose-500 to-indigo-600 overflow-hidden">
        <div className="absolute inset-0 bg-black/10" />
      </div>

      {/* Channel Info */}
      <div className="px-4 sm:px-6 py-4 sm:py-6 border-b">
        <div className="flex flex-col md:flex-row gap-4 sm:gap-6 items-start md:items-center justify-between">
          <div className="flex gap-4 sm:gap-6 items-center">
            <Avatar className="w-16 h-16 sm:w-20 sm:h-20 md:w-28 md:h-28 ring-4 ring-white shadow-md shrink-0">
              <AvatarImage src={channel?.image} />
              <AvatarFallback className="text-xl sm:text-2xl md:text-3xl font-bold bg-zinc-800 text-white">
                {channelInitial}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-1 sm:space-y-1.5 min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 tracking-tight truncate">
                {channel?.channelname || "Channel"}
              </h1>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs md:text-sm text-gray-500">
                <span className="font-medium text-gray-700">{handleTag}</span>
                <span>•</span>
                <span>{formatSubscribers(subscribersCount)}</span>
                <span>•</span>
                <span>{videoCount} {videoCount === 1 ? "video" : "videos"}</span>
              </div>
              {channel?.description && (
                <p className="text-xs md:text-sm text-gray-600 max-w-2xl line-clamp-2 pt-0.5">
                  {channel.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            {isOwner ? (
              <Button
                variant="outline"
                onClick={onEditChannel}
                className="flex items-center gap-2 rounded-full cursor-pointer hover:bg-gray-100"
              >
                <Edit3 className="w-4 h-4" />
                Customize channel
              </Button>
            ) : user ? (
              <Button
                onClick={handleSubscribe}
                variant={isSubscribed ? "secondary" : "default"}
                className={`rounded-full px-5 transition-all cursor-pointer ${
                  isSubscribed
                    ? "bg-gray-100 hover:bg-gray-200 text-gray-800"
                    : "bg-black hover:bg-zinc-800 text-white"
                }`}
              >
                {isSubscribed ? (
                  <>
                    <Check className="w-4 h-4 mr-1.5" />
                    Subscribed
                  </>
                ) : (
                  "Subscribe"
                )}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChannelHeader;
