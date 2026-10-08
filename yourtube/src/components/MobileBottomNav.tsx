import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Home, Compass, Video, PlaySquare, User } from "lucide-react";
import { useUser } from "@/lib/AuthContext";

export const MobileBottomNav = () => {
  const router = useRouter();
  const { user, handlegooglesignin } = useUser();

  const currentPath = router.pathname;

  const isActive = (path: string) => {
    if (path === "/" && currentPath === "/") return true;
    if (path !== "/" && currentPath.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-gray-200 z-30 flex items-center justify-around py-1.5 px-2 select-none safe-area-pb shadow-lg">
      <Link
        href="/"
        className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors ${
          isActive("/") ? "text-red-600 font-semibold" : "text-gray-600 hover:text-black"
        }`}
      >
        <Home className={`w-5 h-5 ${isActive("/") ? "stroke-[2.5]" : "stroke-[1.75]"}`} />
        <span className="text-[10px] mt-0.5">Home</span>
      </Link>

      <Link
        href="/explore"
        className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors ${
          isActive("/explore") ? "text-red-600 font-semibold" : "text-gray-600 hover:text-black"
        }`}
      >
        <Compass className={`w-5 h-5 ${isActive("/explore") ? "stroke-[2.5]" : "stroke-[1.75]"}`} />
        <span className="text-[10px] mt-0.5">Explore</span>
      </Link>

      <Link
        href="/meet"
        className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors ${
          isActive("/meet") ? "text-red-600 font-semibold" : "text-gray-600 hover:text-black"
        }`}
      >
        <div className="relative">
          <Video className="w-5 h-5 text-red-600 stroke-[2.2]" />
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-600 animate-ping" />
        </div>
        <span className="text-[10px] mt-0.5 font-medium text-red-600">Meet</span>
      </Link>

      <Link
        href="/subscriptions"
        className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors ${
          isActive("/subscriptions") ? "text-red-600 font-semibold" : "text-gray-600 hover:text-black"
        }`}
      >
        <PlaySquare className={`w-5 h-5 ${isActive("/subscriptions") ? "stroke-[2.5]" : "stroke-[1.75]"}`} />
        <span className="text-[10px] mt-0.5">Subscriptions</span>
      </Link>

      {user ? (
        <Link
          href={`/channel/${user._id}`}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors ${
            isActive("/channel") || isActive("/history")
              ? "text-red-600 font-semibold"
              : "text-gray-600 hover:text-black"
          }`}
        >
          {user.image ? (
            <img
              src={user.image}
              alt={user.name || "User"}
              className="w-5 h-5 rounded-full object-cover border border-gray-300"
            />
          ) : (
            <User className="w-5 h-5 stroke-[1.75]" />
          )}
          <span className="text-[10px] mt-0.5">You</span>
        </Link>
      ) : (
        <button
          type="button"
          onClick={handlegooglesignin}
          className="flex flex-col items-center justify-center py-1 px-3 rounded-lg text-gray-600 hover:text-black transition-colors cursor-pointer"
        >
          <User className="w-5 h-5 stroke-[1.75]" />
          <span className="text-[10px] mt-0.5">Sign In</span>
        </button>
      )}
    </nav>
  );
};
