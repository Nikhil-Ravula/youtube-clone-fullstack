import { Bell, Menu, Mic, MicOff, Search, User, Upload, Video, ArrowLeft } from "lucide-react";
import React, { useState } from "react";
import { Button } from "./ui/button";
import Link from "next/link";
import { Input } from "./ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import Channeldialogue from "./channeldialogue";
import { NewMeetingModal } from "./meet/NewMeetingModal";
import { useRouter } from "next/router";
import { useUser } from "@/lib/AuthContext";
import { useSidebar } from "@/lib/SidebarContext";
import { toast } from "sonner";

const Header = () => {
  const { user, logout, handlegooglesignin } = useUser();
  const { toggleSidebar } = useSidebar();
  const [searchQuery, setSearchQuery] = useState("");
  const [isdialogeopen, setisdialogeopen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleKeypress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch(e as any);
    }
  };

  const handleCreateVideo = () => {
    if (!user) {
      toast.info("Please sign in first");
      handlegooglesignin();
      return;
    }
    if (user?.channelname) {
      router.push(`/channel/${user._id}`);
      toast.info("Upload your video from your channel page");
    } else {
      setisdialogeopen(true);
    }
  };

  const handleVoiceSearch = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.info("Voice search is not supported in this browser.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "en-US";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        toast.info("Listening... speak now");
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSearchQuery(transcript);
        setIsListening(false);
        router.push(`/search?q=${encodeURIComponent(transcript)}`);
      };

      recognition.onerror = () => {
        setIsListening(false);
        toast.error("Could not capture voice search. Please try again.");
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setIsListening(false);
      toast.error("Could not start microphone.");
    }
  };

  const handleOpenMeetingModal = () => {
    setIsMeetingModalOpen(true);
  };

  return (
    <header className="flex items-center justify-between px-2 sm:px-4 py-2 bg-white border-b sticky top-0 z-30 h-14">
      {isMobileSearchOpen ? (
        /* Mobile Search Bar Mode */
        <div className="flex items-center w-full gap-2 animate-in fade-in duration-150">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileSearchOpen(false)}
            className="shrink-0 h-9 w-9"
            title="Close search"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </Button>

          <form
            onSubmit={(e) => {
              handleSearch(e);
              setIsMobileSearchOpen(false);
            }}
            className="flex-1 flex items-center"
          >
            <Input
              type="search"
              placeholder="Search YourTube"
              autoFocus
              value={searchQuery}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleSearch(e as any);
                  setIsMobileSearchOpen(false);
                }
              }}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-l-full border-r-0 focus-visible:ring-0 h-9 text-sm"
            />
            <Button
              type="submit"
              className="rounded-r-full px-3.5 bg-gray-50 hover:bg-gray-100 text-gray-600 border border-l-0 h-9"
            >
              <Search className="w-4 h-4" />
            </Button>
          </form>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleVoiceSearch}
            className={`rounded-full shrink-0 h-9 w-9 ${
              isListening ? "bg-red-100 text-red-600 animate-pulse" : ""
            }`}
            title="Search with voice"
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>
        </div>
      ) : (
        /* Normal Header Mode */
        <>
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              title="Toggle sidebar"
              className="h-9 w-9 p-0"
            >
              <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
            </Button>
            <Link href="/" className="flex items-center gap-1">
              <div className="bg-red-600 p-1 rounded">
                <svg width="20" height="20" className="sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="white">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </div>
              <span className="text-lg sm:text-xl font-medium tracking-tight">YourTube</span>
              <span className="text-[10px] text-gray-400 ml-0.5">IN</span>
            </Link>
          </div>

          {/* Desktop Search Bar */}
          <form
            onSubmit={handleSearch}
            className="hidden md:flex items-center gap-2 flex-1 max-w-xl mx-4"
          >
            <div className="flex flex-1">
              <Input
                type="search"
                placeholder="Search"
                value={searchQuery}
                onKeyPress={handleKeypress}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-l-full border-r-0 focus-visible:ring-0"
              />
              <Button
                type="submit"
                className="rounded-r-full px-6 bg-gray-50 hover:bg-gray-100 text-gray-600 border border-l-0"
              >
                <Search className="w-5 h-5" />
              </Button>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleVoiceSearch}
              className={`rounded-full ${isListening ? "bg-red-100 text-red-600 animate-pulse" : ""}`}
              title="Search with your voice"
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>
          </form>

          {/* Right Action Icons Group */}
          <div className="flex items-center gap-0.5 sm:gap-1.5 shrink-0">
            {/* Mobile Search Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileSearchOpen(true)}
              title="Search"
              className="md:hidden h-9 w-9"
            >
              <Search className="w-5 h-5 text-zinc-700" />
            </Button>

            {/* Video Meetings Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleOpenMeetingModal}
              title="Start or join a video meeting"
              className="text-zinc-700 hover:text-red-600 transition-colors h-9 w-9"
            >
              <Video className="w-5 h-5 text-red-600" />
            </Button>

            {user ? (
              <>
                {/* Upload video (desktop/tablet) */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCreateVideo}
                  title="Upload video"
                  className="hidden sm:inline-flex h-9 w-9 text-zinc-700 hover:text-zinc-900 transition-colors"
                >
                  <Upload className="w-5 h-5" />
                </Button>

                {/* Notifications (desktop/tablet) */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" title="Notifications" className="hidden sm:inline-flex h-9 w-9">
                      <Bell className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-72 p-3" align="end">
                    <div className="flex items-center justify-between pb-2 border-b mb-2">
                      <h4 className="font-semibold text-sm">Notifications</h4>
                    </div>
                    <div className="py-6 text-center text-xs text-gray-500">
                      <Bell className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                      Your notifications will appear here
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* User Avatar Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-8 w-8 rounded-full p-0 ml-1"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.image} />
                        <AvatarFallback className="text-xs">{user.name?.[0] || "U"}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    {user?.channelname ? (
                      <DropdownMenuItem asChild>
                        <Link href={`/channel/${user?._id}`}>Your channel</Link>
                      </DropdownMenuItem>
                    ) : (
                      <div className="px-2 py-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="w-full"
                          onClick={() => setisdialogeopen(true)}
                        >
                          Create Channel
                        </Button>
                      </div>
                    )}
                    <DropdownMenuItem asChild>
                      <Link href="/meet">Video Meetings</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/history">History</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/liked">Liked videos</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/watch-later">Watch later</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout}>Sign out</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button
                size="sm"
                className="flex items-center gap-1.5 px-3 py-1 text-xs sm:text-sm h-8"
                onClick={handlegooglesignin}
              >
                <User className="w-3.5 h-3.5" />
                <span>Sign in</span>
              </Button>
            )}
          </div>
        </>
      )}
      <Channeldialogue
        isopen={isdialogeopen}
        onclose={() => setisdialogeopen(false)}
        mode="create"
      />
      <NewMeetingModal
        isOpen={isMeetingModalOpen}
        onClose={() => setIsMeetingModalOpen(false)}
      />
    </header>
  );
};

export default Header;

