import React, { useEffect, useState } from "react";
import Videocard from "./videocard";
import axiosInstance from "@/lib/axiosinstance";

interface VideogridProps {
  selectedCategory?: string;
}

const Videogrid = ({ selectedCategory = "All" }: VideogridProps) => {
  const [videos, setvideo] = useState<any[]>([]);
  const [loading, setloading] = useState(true);

  useEffect(() => {
    const fetchvideo = async () => {
      try {
        const res = await axiosInstance.get("/video/getall");
        setvideo(res.data || []);
      } catch (error) {
        console.log(error);
      } finally {
        setloading(false);
      }
    };
    fetchvideo();
  }, []);

  const filteredVideos =
    !selectedCategory || selectedCategory === "All"
      ? videos
      : videos.filter(
          (v: any) =>
            v.videotitle?.toLowerCase().includes(selectedCategory.toLowerCase()) ||
            v.videochanel?.toLowerCase().includes(selectedCategory.toLowerCase())
        );

  if (loading) {
    return <div className="text-gray-500 py-8 text-center">Loading videos...</div>;
  }

  if (filteredVideos.length === 0) {
    return (
      <div className="text-gray-500 py-12 text-center">
        No videos found{selectedCategory !== "All" ? ` for "${selectedCategory}"` : ""}.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {filteredVideos.map((video: any) => (
        <Videocard key={video._id} video={video} />
      ))}
    </div>
  );
};

export default Videogrid;

