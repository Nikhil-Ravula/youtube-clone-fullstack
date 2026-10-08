import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Toaster } from "@/components/ui/sonner";
import { SignInModal } from "@/components/SignInModal";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { UserProvider } from "../lib/AuthContext";
import { SidebarProvider } from "../lib/SidebarContext";
import { useRouter } from "next/router";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  // Active video call rooms are full-screen immersive interfaces without YouTube header/sidebar
  const isMeetRoom = router.pathname.startsWith("/meet/[");
  const isWatchPage = router.pathname.startsWith("/watch");

  if (isMeetRoom) {
    return (
      <UserProvider>
        <SidebarProvider>
          <div className="min-h-screen bg-zinc-950 text-white">
            <title>YourTube Meet</title>
            <Toaster theme="dark" richColors closeButton duration={3000} position="bottom-right" />
            <SignInModal />
            <Component {...pageProps} />
          </div>
        </SidebarProvider>
      </UserProvider>
    );
  }

  return (
    <UserProvider>
      <SidebarProvider>
        <div className="min-h-screen bg-white text-black flex flex-col">
          <title>Your-Tube Clone</title>
          <Header />
          <Toaster richColors closeButton duration={3000} position="bottom-right" />
          <SignInModal />
          <div className="flex flex-1">
            <Sidebar />
            <main className={`flex-1 min-w-0 ${!isWatchPage ? "pb-14 md:pb-0" : ""}`}>
              <Component {...pageProps} />
            </main>
          </div>
          {!isWatchPage && <MobileBottomNav />}
        </div>
      </SidebarProvider>
    </UserProvider>
  );
}
