import React from "react";
import { Button } from "./ui/button";

const tabs = [
  { id: "videos", label: "Videos" },
  { id: "playlists", label: "Playlists" },
  { id: "about", label: "About" },
];

interface ChanneltabsProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

const Channeltabs = ({ activeTab = "videos", onTabChange }: ChanneltabsProps) => {
  return (
    <div className="border-b px-4">
      <div className="flex gap-8 overflow-x-auto scrollbar-none">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant="ghost"
            className={`px-1 py-4 border-b-2 rounded-none font-medium text-sm transition-colors cursor-pointer ${
              activeTab === tab.id
                ? "border-black text-black font-semibold"
                : "border-transparent text-gray-600 hover:text-black"
            }`}
            onClick={() => onTabChange?.(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default Channeltabs;

