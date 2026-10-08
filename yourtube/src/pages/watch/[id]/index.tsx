import Comments from "@/components/Comments";
import RelatedVideos from "@/components/RelatedVideos";
import VideoInfo from "@/components/VideoInfo";
import VideoPlayer from "@/components/Videopplayer";
import axiosInstance from "@/lib/axiosinstance";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const WatchPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const [currentVideo, setCurrentVideo] = useState<any>(null);
  const [allVideos, setAllVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideo = async () => {
      if (!id || typeof id !== "string") return;
      setLoading(true);
      try {
        const res = await axiosInstance.get("/video/getall");
        const list = Array.isArray(res.data) ? res.data : [];
        const found = list.find((vid: any) => vid._id === id);
        setCurrentVideo(found || null);
        setAllVideos(list);
      } catch (error) {
        console.error("Error fetching video:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchVideo();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white w-full p-4 md:p-6 max-w-[1700px] mx-auto animate-pulse">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="aspect-video bg-gray-200 rounded-xl w-full" />
            <div className="h-7 bg-gray-200 rounded w-3/4" />
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gray-200" />
              <div className="space-y-1.5 flex-1">
                <div className="h-4 bg-gray-200 rounded w-1/4" />
                <div className="h-3 bg-gray-200 rounded w-1/6" />
              </div>
            </div>
          </div>
          <div className="space-y-4 hidden lg:block">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="w-40 h-24 bg-gray-200 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-gray-200 rounded w-full" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!currentVideo) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-bold mb-2">Video unavailable</h2>
        <p className="text-gray-500 mb-6 max-w-md">
          This video isn't available anymore or was removed.
        </p>
        <Link href="/">
          <Button className="gap-2">
            <Home className="w-4 h-4" /> Go back to Home
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{`${currentVideo.videotitle || "Watch"} - YourTube`}</title>
      </Head>
      <div className="min-h-screen bg-white w-full">
        <div className="max-w-[1750px] mx-auto p-2 sm:p-4 md:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <VideoPlayer video={currentVideo} />
              <VideoInfo video={currentVideo} />
              <Comments videoId={id} />
            </div>
            <div className="space-y-4">
              <RelatedVideos
                videos={allVideos.filter((v: any) => v._id !== id)}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default WatchPage;
