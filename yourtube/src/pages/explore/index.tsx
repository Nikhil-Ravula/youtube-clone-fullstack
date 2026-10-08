import React, { useEffect, useState } from "react";
import Videocard from "@/components/videocard";
import axiosInstance from "@/lib/axiosinstance";
import { Flame, Music, Gamepad2, Film, Newspaper, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

const exploreCategories = [
  { name: "Trending", icon: Flame, color: "text-orange-500" },
  { name: "Music", icon: Music, color: "text-emerald-600" },
  { name: "Gaming", icon: Gamepad2, color: "text-purple-600" },
  { name: "Movies", icon: Film, color: "text-red-500" },
  { name: "News", icon: Newspaper, color: "text-blue-500" },
  { name: "Sports", icon: Trophy, color: "text-amber-500" },
];

export default function ExplorePage() {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("Trending");

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const res = await axiosInstance.get("/video/getall");
        setVideos(res.data || []);
      } catch (error) {
        console.error("Error loading explore videos:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchVideos();
  }, []);

  const filteredVideos =
    selectedCategory === "Trending"
      ? [...videos].sort((a, b) => (b.views || 0) - (a.views || 0))
      : videos.filter((v) =>
          v.videotitle?.toLowerCase().includes(selectedCategory.toLowerCase()) ||
          v.videochanel?.toLowerCase().includes(selectedCategory.toLowerCase())
        );

  return (
    <main className="flex-1 p-3 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">Explore</h1>

        <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3">
          {exploreCategories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.name;
            return (
              <button
                key={cat.name}
                type="button"
                onClick={() => setSelectedCategory(cat.name)}
                className={`h-20 flex flex-col items-center justify-center gap-1.5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? "bg-zinc-900 text-white border-zinc-900 shadow-md scale-[1.02]"
                    : "bg-gray-100 hover:bg-gray-200/80 text-gray-800 border-gray-200/80 hover:border-gray-300"
                }`}
              >
                <Icon
                  className={`w-6 h-6 transition-transform ${
                    isSelected ? "text-white" : cat.color
                  }`}
                />
                <span className="text-xs font-semibold tracking-wide">
                  {cat.name}
                </span>
              </button>
            );
          })}
        </div>


        <div className="pt-4">
          <h2 className="text-lg font-semibold mb-4">
            {selectedCategory === "Trending" ? "Trending Videos" : `${selectedCategory} Videos`}
          </h2>

          {loading ? (
            <div className="text-gray-500 py-8 text-center">Loading videos...</div>
          ) : filteredVideos.length === 0 ? (
            <div className="text-gray-500 py-8 text-center">
              No videos found for this category yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredVideos.map((video) => (
                <Videocard key={video._id} video={video} />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
