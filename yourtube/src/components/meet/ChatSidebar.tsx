import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Send,
  Paperclip,
  Smile,
  FileText,
  Download,
  Image as ImageIcon,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { ChatMessage } from "@/lib/webrtc/useMeetingRoom";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "sonner";

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (text: string, fileData?: { fileUrl: string; fileName: string; fileSize: number }) => void;
  allowChat: boolean;
  isHostOrCoHost: boolean;
  currentUserId: string;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  isOpen,
  onClose,
  messages,
  onSendMessage,
  allowChat,
  isHostOrCoHost,
  currentUserId,
}) => {
  const [inputText, setInputText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;
    if (!allowChat && !isHostOrCoHost) {
      toast.error("Chat is disabled by the host.");
      return;
    }
    onSendMessage(inputText.trim());
    setInputText("");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!allowChat && !isHostOrCoHost) {
      toast.error("Chat is disabled by the host.");
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      toast.error("File size exceeds 25MB limit.");
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const response = await axiosInstance.post("/meeting/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const { fileUrl, fileName, fileSize } = response.data;
      onSendMessage(`Shared a file: ${fileName}`, { fileUrl, fileName, fileSize });
      toast.success("File shared in meeting!");
    } catch (err) {
      console.error("File upload error:", err);
      toast.error("Failed to upload file");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImageFile = (filename?: string) => {
    if (!filename) return false;
    return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(filename);
  };

  const emojis = ["👍", "❤️", "🔥", "🎉", "👏", "😂", "🚀", "💡", "🙌", "✨"];

  return (
    <div className="fixed inset-0 z-50 md:relative md:inset-auto md:w-80 lg:w-96 md:z-20 w-full h-full bg-zinc-950 border-l border-zinc-800 flex flex-col transition-all duration-300">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm text-zinc-100">In-call Messages</h3>
          <p className="text-[11px] text-zinc-400">Messages are visible to participants</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-zinc-900 md:bg-transparent hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
          title="Close chat"
        >
          <X className="w-5 h-5 md:w-4 md:h-4" />
        </button>
      </div>

      {/* Notice if chat disabled */}
      {!allowChat && !isHostOrCoHost && (
        <div className="bg-amber-950/40 border-b border-amber-600/30 p-2.5 flex items-center gap-2 text-xs text-amber-300">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Chat has been disabled by the meeting host.</span>
        </div>
      )}

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500 text-xs py-8">
            <p className="font-medium text-zinc-400">No messages yet</p>
            <p className="text-[11px] mt-1">Send a message to everyone in the call</p>
          </div>
        ) : (
          messages.map((msg) => {
            if (msg.type === "system") {
              return (
                <div key={msg.id} className="text-center my-2">
                  <span className="text-[11px] bg-zinc-900 text-zinc-400 px-3 py-1 rounded-full border border-zinc-800">
                    {msg.message}
                  </span>
                </div>
              );
            }

            const isSelf = msg.senderId === currentUserId;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isSelf ? "items-end" : "items-start"}`}
              >
                <div className="flex items-baseline gap-1.5 mb-1 px-1">
                  <span className="text-xs font-semibold text-zinc-300">
                    {isSelf ? "You" : msg.senderName}
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs break-words shadow-sm ${
                    isSelf
                      ? "bg-red-600 text-white rounded-tr-none"
                      : "bg-zinc-800 text-zinc-200 rounded-tl-none border border-zinc-700/50"
                  }`}
                >
                  {/* File preview if present */}
                  {msg.fileUrl && (
                    <div className="mb-2">
                      {isImageFile(msg.fileName) ? (
                        <a href={msg.fileUrl} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg">
                          <img
                            src={msg.fileUrl}
                            alt={msg.fileName}
                            className="max-h-48 object-cover rounded-lg hover:opacity-90 transition-opacity"
                          />
                        </a>
                      ) : (
                        <div className="flex items-center gap-2 p-2 bg-black/30 rounded-xl">
                          <FileText className="w-6 h-6 text-zinc-300 shrink-0" />
                          <div className="truncate flex-1">
                            <p className="font-medium truncate">{msg.fileName}</p>
                            <p className="text-[10px] opacity-75">{formatFileSize(msg.fileSize)}</p>
                          </div>
                          <a
                            href={msg.fileUrl}
                            download={msg.fileName}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                            title="Download file"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  <p className="whitespace-pre-wrap">{msg.message}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Emojis Bar */}
      <div className="px-3 py-1.5 border-t border-zinc-900 bg-zinc-950/60 flex items-center justify-between overflow-x-auto">
        {emojis.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onSendMessage(emoji)}
            disabled={!allowChat && !isHostOrCoHost}
            className="hover:scale-125 transition-transform p-1 text-sm rounded hover:bg-zinc-800 disabled:opacity-40"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div className="p-3 border-t border-zinc-800 bg-zinc-900/60">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          {/* File Attachment Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={(!allowChat && !isHostOrCoHost) || isUploading}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-40 transition-colors"
            title="Attach file (up to 25MB)"
          >
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin text-red-500" /> : <Paperclip className="w-4 h-4" />}
          </button>

          {/* Text Input */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={!allowChat && !isHostOrCoHost}
            placeholder={
              !allowChat && !isHostOrCoHost ? "Chat disabled by host" : "Send a message to everyone..."
            }
            className="flex-1 bg-zinc-900 border border-zinc-700/60 focus:border-red-500 focus:outline-none rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 disabled:opacity-50"
          />

          {/* Submit */}
          <button
            type="submit"
            disabled={!inputText.trim() || (!allowChat && !isHostOrCoHost)}
            className="p-2 rounded-xl bg-red-600 hover:bg-red-700 text-white disabled:opacity-40 transition-colors shadow-md"
            title="Send"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
