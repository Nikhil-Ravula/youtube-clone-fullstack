import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { MoreVertical, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import axiosInstance from "@/lib/axiosinstance";
import { useUser } from "@/lib/AuthContext";
import { toast } from "sonner";
import { getMediaUrl } from "@/lib/mediaUrl";

export default function HistoryContent() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, handlegooglesignin } = useUser();

  useEffect(() => {
    if (user) {
      loadHistory();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadHistory = async () => {
    if (!user) return;
    try {
      const historyData = await axiosInstance.get(`/history/${user?._id}`);
      const validHistory = (historyData.data || []).filter((item: any) => item.videoid);
      setHistory(validHistory);
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromHistory = async (historyId: string) => {
    try {
      await axiosInstance.delete(`/history/${historyId}`);
      setHistory((prev) => prev.filter((item) => item._id !== historyId));
      toast.success("Removed from watch history");
    } catch (error) {
      console.error("Error removing from history:", error);
      toast.error("Could not remove item");
    }
  };

  if (!user) {
    return (
      <div className="text-center py-12 flex flex-col items-center">
        <Clock className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold mb-2">
          Keep track of what you watch
        </h2>
        <p className="text-gray-600 mb-4 max-w-sm">
          Watch history isn't viewable when signed out. Sign in to view and manage your watch history.
        </p>
        <Button onClick={handlegooglesignin} className="bg-red-600 hover:bg-red-700 text-white font-medium">
          Sign In
        </Button>
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading history...</div>;
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold mb-2">No watch history yet</h2>
        <p className="text-gray-600">Videos you watch will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">{history.length} videos</p>
      </div>

      <div className="space-y-4">
        {history.map((item) => {
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
                  onClick={() => handleRemoveFromHistory(item._id)}
                >
                  <X className="w-4 h-4 mr-2" />
                  Remove from watch history
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

