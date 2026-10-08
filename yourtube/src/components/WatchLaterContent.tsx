import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { MoreVertical, X, Clock, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import axiosInstance from "@/lib/axiosinstance";
import { useUser } from "@/lib/AuthContext";
import { useRouter } from "next/router";
import { toast } from "sonner";
import { getMediaUrl } from "@/lib/mediaUrl";

export default function WatchLaterContent() {
  const [watchLater, setWatchLater] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, handlegooglesignin } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      loadWatchLater();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadWatchLater = async () => {
    if (!user) return;
    try {
      const watchLaterData = await axiosInstance.get(`/watch/${user?._id}`);
      const validVideos = (watchLaterData.data || []).filter((item: any) => item.videoid);
      setWatchLater(validVideos);
    } catch (error) {
      console.error("Error loading watch later:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromWatchLater = async (videoId: string, watchLaterId: string) => {
    if (!user) return;
    try {
      await axiosInstance.post(`/watch/${videoId}`, { userId: user._id });
      setWatchLater((prev) => prev.filter((item) => item._id !== watchLaterId));
      toast.success("Removed from Watch Later");
    } catch (error) {
      console.error("Error removing from watch later:", error);
      toast.error("Could not remove video");
    }
  };

  const handlePlayAll = () => {
    if (watchLater.length > 0 && watchLater[0].videoid?._id) {
      router.push(`/watch/${watchLater[0].videoid._id}`);
    } else {
      toast.info("No videos to play");
    }
  };

  if (!user) {
    return (
      <div className="text-center py-12 flex flex-col items-center">
        <Clock className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Save videos for later</h2>
        <p className="text-gray-600 mb-4 max-w-sm">
          Sign in to access your Watch later playlist.
        </p>
        <Button onClick={handlegooglesignin} className="bg-red-600 hover:bg-red-700 text-white font-medium">
          Sign In
        </Button>
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading watch later...</div>;
  }

  if (watchLater.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold mb-2">No videos saved</h2>
        <p className="text-gray-600">
          Videos you save for later will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">{watchLater.length} videos</p>
        <Button onClick={handlePlayAll} className="flex items-center gap-2">
          <Play className="w-4 h-4 fill-white" />
          Play all
        </Button>
      </div>

      <div className="space-y-4">
        {watchLater.map((item) => {
          const videoSrc = getMediaUrl(item.videoid?.filepath);

          return (
            <div key={item._id} className="flex gap-3 sm:gap-4 group">
              <Link href={`/watch/${item.videoid?._id}`} className="flex-shrink-0">
                <div className="relative w-32 sm:w-40 aspect-video bg-gray-100 rounded overflow-hidden">
                  <video
                    src={videoSrc}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                </div>
              </Link>

            <div className="flex-1 min-w-0">
              <Link href={`/watch/${item.videoid?._id}`}>
                <h3 className="font-medium text-xs sm:text-sm line-clamp-2 group-hover:text-blue-600 mb-1">
                  {item.videoid?.videotitle}
                </h3>
              </Link>
              <p className="text-xs text-gray-600">
                {item.videoid?.videochanel}
              </p>
              <p className="text-xs text-gray-500">
                {item.videoid?.views?.toLocaleString() || 0} views •{" "}
                {item.videoid?.createdAt
                  ? `${formatDistanceToNow(new Date(item.videoid.createdAt))} ago`
                  : "Recently"}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Added {item.createdAt ? `${formatDistanceToNow(new Date(item.createdAt))} ago` : ""}
              </p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-100 sm:opacity-0 group-hover:opacity-100 h-8 w-8"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() =>
                    handleRemoveFromWatchLater(item.videoid?._id, item._id)
                  }
                >
                  <X className="w-4 h-4 mr-2" />
                  Remove from Watch later
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      })}
      </div>
    </div>
  );
}

