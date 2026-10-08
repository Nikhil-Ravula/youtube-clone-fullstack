import ChannelHeader from "@/components/ChannelHeader";
import Channeltabs from "@/components/Channeltabs";
import ChannelVideos from "@/components/ChannelVideos";
import VideoUploader from "@/components/VideoUploader";
import Channeldialogue from "@/components/channeldialogue";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { useRouter } from "next/router";
import React, { useEffect, useState, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { Eye, Calendar, Info } from "lucide-react";

const ChannelPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useUser();

  const [channel, setChannel] = useState<any>(null);
  const [channelVideos, setChannelVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("videos");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const loadChannelData = useCallback(async () => {
    if (!id || typeof id !== "string") return;

    try {
      // 1. Fetch channel owner data
      if (user && user._id === id) {
        setChannel(user);
      } else {
        try {
          const userRes = await axiosInstance.get(`/user/${id}`);
          setChannel(userRes.data);
        } catch {
          // Fallback if not found
          setChannel(user?._id === id ? user : null);
        }
      }

      // 2. Fetch channel's uploaded videos
      const videoRes = await axiosInstance.get("/video/getall");
      const allVideos = videoRes.data || [];
      const userVideos = allVideos.filter(
        (v: any) => v.uploader === id || (user && user._id === id && v.uploader === user._id)
      );
      setChannelVideos(userVideos);
    } catch (error) {
      console.error("Error fetching channel data:", error);
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    loadChannelData();
  }, [loadChannelData]);

  if (loading) {
    return (
      <div className="flex-1 min-h-screen bg-white p-8 text-center text-gray-500">
        Loading channel...
      </div>
    );
  }

  const isOwner = user && channel && user._id === channel._id;
  const totalViews = channelVideos.reduce((acc, v) => acc + (v.views || 0), 0);

  return (
    <div className="flex-1 min-h-screen bg-white">
      <div className="max-w-full mx-auto">
        <ChannelHeader
          channel={channel || user}
          user={user}
          onEditChannel={() => setIsEditDialogOpen(true)}
          videoCount={channelVideos.length}
        />

        <Channeltabs activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
          {activeTab === "videos" && (
            <div className="space-y-8">
              {isOwner && (
                <VideoUploader
                  channelId={typeof id === "string" ? id : undefined}
                  channelName={channel?.channelname || user?.channelname}
                  onUploadSuccess={loadChannelData}
                />
              )}
              <ChannelVideos videos={channelVideos} />
            </div>
          )}

          {activeTab === "playlists" && (
            <div className="text-center py-16 text-gray-500">
              No playlists created yet.
            </div>
          )}

          {activeTab === "about" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-4">
              <div className="md:col-span-2 space-y-4">
                <h3 className="font-semibold text-lg text-gray-900 flex items-center gap-2">
                  <Info className="w-5 h-5 text-gray-600" />
                  Description
                </h3>
                <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                  {channel?.description || "This channel has not added a description yet."}
                </p>
              </div>

              <div className="space-y-4 border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-8">
                <h3 className="font-semibold text-sm text-gray-900">Stats</h3>
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>
                      Joined{" "}
                      {channel?.joinedon
                        ? `${formatDistanceToNow(new Date(channel.joinedon))} ago`
                        : "Recently"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Eye className="w-4 h-4 text-gray-400" />
                    <span>{totalViews.toLocaleString()} total views</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Channeldialogue
        isopen={isEditDialogOpen}
        onclose={() => {
          setIsEditDialogOpen(false);
          loadChannelData();
        }}
        channeldata={channel}
        mode="edit"
      />
    </div>
  );
};

export default ChannelPage;

