import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  Clock,
  Download,
  MoreHorizontal,
  Share,
  ThumbsDown,
  ThumbsUp,
  Check,
  Flag,
  Code,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "sonner";
import { formatSubscribers } from "@/lib/formatSubscribers";
import { getMediaUrl } from "@/lib/mediaUrl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

const VideoInfo = ({ video }: any) => {
  const [likes, setlikes] = useState(video.Like || 0);
  const [dislikes, setDislikes] = useState(video.Dislike || 0);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscribersCount, setSubscribersCount] = useState(0);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const { user } = useUser();
  const [isWatchLater, setIsWatchLater] = useState(false);

  useEffect(() => {
    setlikes(video.Like || 0);
    setDislikes(video.Dislike || 0);
    setIsLiked(false);
    setIsDisliked(false);

    // Fetch real subscription status & count from API
    const channelId = video.uploader || video.videochanel || "";
    if (channelId) {
      const subscriberId = user?._id || user?.id || "";
      const url = subscriberId
        ? `/subscription/status/${channelId}?subscriberId=${subscriberId}`
        : `/subscription/status/${channelId}`;

      axiosInstance
        .get(url)
        .then((res) => {
          if (res.data) {
            setSubscribersCount(res.data.count || 0);
            setIsSubscribed(!!res.data.isSubscribed);
          }
        })
        .catch(() => {
          const subKey = `sub_${channelId}`;
          const savedSub = localStorage.getItem(subKey);
          setIsSubscribed(savedSub === "true");
          setSubscribersCount(savedSub === "true" ? 1 : 0);
        });
    }

    // Check if user already liked or saved to watch later
    if (user && video?._id) {
      axiosInstance
        .get(`/like/${user._id}`)
        .then((res) => {
          const hasLiked = res.data?.some(
            (item: any) => item.videoid?._id === video._id
          );
          if (hasLiked) setIsLiked(true);
        })
        .catch((err) => console.log(err));

      axiosInstance
        .get(`/watch/${user._id}`)
        .then((res) => {
          const hasWatchLater = res.data?.some(
            (item: any) => item.videoid?._id === video._id
          );
          if (hasWatchLater) setIsWatchLater(true);
        })
        .catch((err) => console.log(err));
    }
  }, [video, user]);

  useEffect(() => {
    const handleviews = async () => {
      try {
        if (user) {
          await axiosInstance.post(`/history/${video._id}`, {
            userId: user?._id,
          });
        } else {
          await axiosInstance.post(`/history/views/${video?._id}`);
        }
      } catch (error) {
        console.error("View tracking error:", error);
      }
    };
    if (video?._id) {
      handleviews();
    }
  }, [user, video?._id]);


  const handleLike = async () => {
    if (!user) {
      toast.info("Please sign in to like videos");
      return;
    }
    try {
      const res = await axiosInstance.post(`/like/${video._id}`, {
        userId: user?._id,
      });
      if (res.data.liked) {
        setlikes((prev: any) => prev + 1);
        setIsLiked(true);
        if (isDisliked) {
          setDislikes((prev: any) => Math.max(0, prev - 1));
          setIsDisliked(false);
        }
        toast.success("Added to Liked videos");
      } else {
        setlikes((prev: any) => Math.max(0, prev - 1));
        setIsLiked(false);
        toast.info("Removed from Liked videos");
      }
    } catch (error) {
      console.log(error);
      toast.error("Error updating like");
    }
  };

  const handleDislike = async () => {
    if (!user) {
      toast.info("Please sign in to dislike videos");
      return;
    }

    if (isDisliked) {
      setIsDisliked(false);
      setDislikes((prev: any) => Math.max(0, prev - 1));
    } else {
      setIsDisliked(true);
      setDislikes((prev: any) => prev + 1);

      // If video was previously liked, unlike on backend
      if (isLiked) {
        try {
          await axiosInstance.post(`/like/${video._id}`, {
            userId: user?._id,
          });
          setlikes((prev: any) => Math.max(0, prev - 1));
          setIsLiked(false);
        } catch (error) {
          console.log(error);
        }
      }
    }
  };

  const handleWatchLater = async () => {
    if (!user) {
      toast.info("Please sign in to save videos");
      return;
    }
    try {
      const res = await axiosInstance.post(`/watch/${video._id}`, {
        userId: user?._id,
      });
      if (res.data.watchlater) {
        setIsWatchLater(true);
        toast.success("Saved to Watch Later");
      } else {
        setIsWatchLater(false);
        toast.info("Removed from Watch Later");
      }
    } catch (error) {
      console.log(error);
      toast.error("Error saving to watch later");
    }
  };

  const handleSubscribe = async () => {
    if (!user) {
      toast.info("Please sign in to subscribe");
      return;
    }
    const channelId = video.uploader || video.videochanel || "";
    const subscriberId = user?._id || user?.id;

    if (channelId === subscriberId) {
      toast.info("You cannot subscribe to your own channel");
      return;
    }

    try {
      const res = await axiosInstance.post("/subscription/toggle", {
        channelId,
        subscriberId,
        channelName: video.videochanel || "Channel",
      });
      setIsSubscribed(res.data.isSubscribed);
      setSubscribersCount(res.data.count);
      if (res.data.isSubscribed) {
        toast.success(`Subscribed to ${video.videochanel}!`);
      } else {
        toast.info(`Unsubscribed from ${video.videochanel}`);
      }
    } catch {
      const subKey = `sub_${channelId}`;
      if (isSubscribed) {
        setIsSubscribed(false);
        setSubscribersCount((prev) => Math.max(0, prev - 1));
        localStorage.removeItem(subKey);
        toast.info(`Unsubscribed from ${video.videochanel}`);
      } else {
        setIsSubscribed(true);
        setSubscribersCount((prev) => prev + 1);
        localStorage.setItem(subKey, "true");
        toast.success(`Subscribed to ${video.videochanel}!`);
      }
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Video link copied to clipboard!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleDownload = () => {
    if (!video?.filepath) {
      toast.error("Video file not available for download");
      return;
    }
    const downloadUrl = getMediaUrl(video.filepath);
    const anchor = document.createElement("a");
    anchor.href = downloadUrl;
    anchor.download = `${video.videotitle || "video"}.mp4`;
    anchor.target = "_blank";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    toast.success("Download started");
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{video.videotitle}</h1>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        {/* Channel info and subscribe button */}
        <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarFallback>{video.videochanel?.[0] || "C"}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-medium text-sm sm:text-base">{video.videochanel}</h3>
              <p className="text-xs text-gray-600">
                {formatSubscribers(subscribersCount)}
              </p>
            </div>
          </div>
          <Button
            onClick={handleSubscribe}
            variant={isSubscribed ? "secondary" : "default"}
            className={`rounded-full transition-all text-xs sm:text-sm px-3.5 py-1.5 sm:ml-4 shrink-0 ${
              isSubscribed
                ? "bg-gray-100 hover:bg-gray-200 text-gray-800"
                : "bg-black hover:bg-zinc-800 text-white"
            }`}
          >
            {isSubscribed ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1" />
                Subscribed
              </>
            ) : (
              "Subscribe"
            )}
          </Button>
        </div>

        {/* Action pills: overflow-x-auto for smooth swipe on mobile */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none max-w-full shrink-0">
          {/* Like / Dislike group */}
          <div className="flex items-center bg-gray-100 rounded-full">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-l-full px-3"
              onClick={handleLike}
              title="I like this"
            >
              <ThumbsUp
                className={`w-4 h-4 mr-1.5 ${
                  isLiked ? "fill-black text-black" : ""
                }`}
              />
              <span className="text-xs font-semibold">{likes.toLocaleString()}</span>
            </Button>
            <div className="w-px h-5 bg-gray-300" />
            <Button
              variant="ghost"
              size="sm"
              className="rounded-r-full px-3"
              onClick={handleDislike}
              title="I dislike this"
            >
              <ThumbsDown
                className={`w-4 h-4 mr-1.5 ${
                  isDisliked ? "fill-black text-black" : ""
                }`}
              />
              {dislikes > 0 && (
                <span className="text-xs">{dislikes.toLocaleString()}</span>
              )}
            </Button>
          </div>

          {/* Watch later button */}
          <Button
            variant="ghost"
            size="sm"
            className={`bg-gray-100 rounded-full hover:bg-gray-200 ${
              isWatchLater ? "text-blue-600 font-medium" : ""
            }`}
            onClick={handleWatchLater}
            title="Save for later"
          >
            <Clock className="w-4 h-4 mr-1.5" />
            {isWatchLater ? "Saved" : "Watch Later"}
          </Button>

          {/* Share button */}
          <Button
            variant="ghost"
            size="sm"
            className="bg-gray-100 hover:bg-gray-200 rounded-full"
            onClick={handleShare}
            title="Share video"
          >
            <Share className="w-4 h-4 mr-1.5" />
            Share
          </Button>

          {/* Download button */}
          <Button
            variant="ghost"
            size="sm"
            className="bg-gray-100 hover:bg-gray-200 rounded-full"
            onClick={handleDownload}
            title="Download video"
          >
            <Download className="w-4 h-4 mr-1.5" />
            Download
          </Button>

          {/* More options dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="bg-gray-100 hover:bg-gray-200 rounded-full h-8 w-8"
                title="More actions"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleShare}>
                <Code className="w-4 h-4 mr-2" />
                Copy video URL
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  toast.success("Thank you! Report submitted for review.")
                }
              >
                <Flag className="w-4 h-4 mr-2 text-red-500" />
                Report video
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Description section */}
      <div className="bg-gray-100 rounded-lg p-4">
        <div className="flex gap-4 text-sm font-medium mb-2">
          <span>{video.views?.toLocaleString() || 0} views</span>
          <span>
            {video.createdAt
              ? `${formatDistanceToNow(new Date(video.createdAt))} ago`
              : "Recently"}
          </span>
        </div>
        <div className={`text-sm ${showFullDescription ? "" : "line-clamp-3"}`}>
          <p className="text-gray-800 whitespace-pre-line">
            {video.description ||
              `Published by ${video.videochanel || "Unknown creator"}. Enjoy watching and don't forget to like and subscribe!`}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 p-0 h-auto font-medium text-xs text-gray-700 hover:text-black"
          onClick={() => setShowFullDescription(!showFullDescription)}
        >
          {showFullDescription ? "Show less" : "Show more"}
        </Button>
      </div>
    </div>
  );
};

export default VideoInfo;

