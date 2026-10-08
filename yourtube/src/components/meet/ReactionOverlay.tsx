import React from "react";
import { FloatingReaction } from "@/lib/webrtc/useMeetingRoom";

interface ReactionOverlayProps {
  reactions: FloatingReaction[];
}

export const ReactionOverlay: React.FC<ReactionOverlayProps> = ({ reactions }) => {
  if (reactions.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-40">
      {reactions.map((r, index) => {
        // Random horizontal position for visual variety
        const randomLeft = 20 + ((index * 37) % 60);

        return (
          <div
            key={r.id}
            style={{ left: `${randomLeft}%` }}
            className="absolute bottom-20 flex flex-col items-center animate-reaction-float"
          >
            <span className="text-4xl filter drop-shadow-lg">{r.emoji}</span>
            <span className="text-[10px] font-semibold text-white/90 bg-black/60 px-2 py-0.5 rounded-full mt-1 backdrop-blur-sm">
              {r.senderName}
            </span>
          </div>
        );
      })}
    </div>
  );
};
