import {
  Home,
  Compass,
  PlaySquare,
  Clock,
  ThumbsUp,
  History,
  User,
  Video,
} from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { Button } from "./ui/button";
import Channeldialogue from "./channeldialogue";
import { useUser } from "@/lib/AuthContext";
import { useSidebar } from "@/lib/SidebarContext";

const Sidebar = () => {
  const { user } = useUser();
  const { isOpen, closeSidebar } = useSidebar();
  const [isdialogeopen, setisdialogeopen] = useState(false);

  const handleLinkClick = () => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      closeSidebar();
    }
  };

  if (!isOpen) {
    return (
      <aside className="hidden md:flex w-18 bg-white border-r min-h-screen p-1 flex-col items-center gap-2 shrink-0">
        <Link href="/" className="w-full">
          <Button
            variant="ghost"
            className="w-full flex-col h-auto py-3 px-1 gap-1 text-[10px]"
          >
            <Home className="w-5 h-5" />
            <span>Home</span>
          </Button>
        </Link>
        <Link href="/explore" className="w-full">
          <Button
            variant="ghost"
            className="w-full flex-col h-auto py-3 px-1 gap-1 text-[10px]"
          >
            <Compass className="w-5 h-5" />
            <span>Explore</span>
          </Button>
        </Link>
        <Link href="/subscriptions" className="w-full">
          <Button
            variant="ghost"
            className="w-full flex-col h-auto py-3 px-1 gap-1 text-[10px]"
          >
            <PlaySquare className="w-5 h-5" />
            <span>Subscriptions</span>
          </Button>
        </Link>
        <Link href="/meet" className="w-full">
          <Button
            variant="ghost"
            className="w-full flex-col h-auto py-3 px-1 gap-1 text-[10px]"
          >
            <Video className="w-5 h-5 text-red-600" />
            <span>Meet</span>
          </Button>
        </Link>
        {user && (
          <Link href="/history" className="w-full">
            <Button
              variant="ghost"
              className="w-full flex-col h-auto py-3 px-1 gap-1 text-[10px]"
            >
              <History className="w-5 h-5" />
              <span>History</span>
            </Button>
          </Link>
        )}
      </aside>
    );
  }

  return (
    <>
      {/* Mobile Dark Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-xs transition-opacity"
        onClick={closeSidebar}
      />

      {/* Sidebar Drawer */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-white border-r min-h-screen p-2 transition-transform duration-200 shadow-2xl md:relative md:shadow-none md:z-auto shrink-0">
        <nav className="space-y-1">
          <Link href="/" onClick={handleLinkClick}>
            <Button variant="ghost" className="w-full justify-start">
              <Home className="w-5 h-5 mr-3" />
              Home
            </Button>
          </Link>
          <Link href="/explore" onClick={handleLinkClick}>
            <Button variant="ghost" className="w-full justify-start">
              <Compass className="w-5 h-5 mr-3" />
              Explore
            </Button>
          </Link>
          <Link href="/subscriptions" onClick={handleLinkClick}>
            <Button variant="ghost" className="w-full justify-start">
              <PlaySquare className="w-5 h-5 mr-3" />
              Subscriptions
            </Button>
          </Link>
          <Link href="/meet" onClick={handleLinkClick}>
            <Button variant="ghost" className="w-full justify-start text-red-600 hover:text-red-700">
              <Video className="w-5 h-5 mr-3 text-red-600" />
              Video Meet
            </Button>
          </Link>

          {user && (
            <>
              <div className="border-t pt-2 mt-2">
                <Link href="/history" onClick={handleLinkClick}>
                  <Button variant="ghost" className="w-full justify-start">
                    <History className="w-5 h-5 mr-3" />
                    History
                  </Button>
                </Link>
                <Link href="/liked" onClick={handleLinkClick}>
                  <Button variant="ghost" className="w-full justify-start">
                    <ThumbsUp className="w-5 h-5 mr-3" />
                    Liked videos
                  </Button>
                </Link>
                <Link href="/watch-later" onClick={handleLinkClick}>
                  <Button variant="ghost" className="w-full justify-start">
                    <Clock className="w-5 h-5 mr-3" />
                    Watch later
                  </Button>
                </Link>
                {user?.channelname ? (
                  <Link href={`/channel/${user?._id}`} onClick={handleLinkClick}>
                    <Button variant="ghost" className="w-full justify-start">
                      <User className="w-5 h-5 mr-3" />
                      Your channel
                    </Button>
                  </Link>
                ) : (
                  <div className="px-2 py-1.5">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        handleLinkClick();
                        setisdialogeopen(true);
                      }}
                    >
                      Create Channel
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </nav>
        <Channeldialogue
          isopen={isdialogeopen}
          onclose={() => setisdialogeopen(false)}
        />
      </aside>
    </>
  );
};

export default Sidebar;
