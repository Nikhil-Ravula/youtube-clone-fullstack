"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import {
  formatDistanceToNow,
  format,
  differenceInMinutes,
} from "date-fns";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "sonner";
import {
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Globe,
  Flag,
  MoreVertical,
  Edit2,
  Trash2,
  CornerDownRight,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  MapPin,
  Clock,
  Sparkles,
  ArrowUpDown,
  RotateCw,
  HelpCircle,
  Check,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { ReportCommentModal } from "./ReportCommentModal";

interface ReplyItem {
  _id: string;
  videoid: string;
  userid: string;
  usercommented: string;
  userimage?: string;
  userlocation?: string;
  commentbody: string;
  commentedon: string;
  parentCommentId: string;
  likesCount?: number;
  dislikesCount?: number;
  likes?: string[];
  dislikes?: string[];
  isEdited?: boolean;
  editedAt?: string;
  isDeleted?: boolean;
  mentions?: string[];
  language?: string;
}

interface CommentItem {
  _id: string;
  videoid: string;
  userid: string;
  usercommented: string;
  userimage?: string;
  userlocation?: string;
  commentbody: string;
  commentedon: string;
  parentCommentId?: string | null;
  replyCount?: number;
  likesCount?: number;
  dislikesCount?: number;
  likes?: string[];
  dislikes?: string[];
  isEdited?: boolean;
  editedAt?: string;
  isDeleted?: boolean;
  mentions?: string[];
  language?: string;
  replies?: ReplyItem[];
}

const TARGET_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "hi", name: "Hindi (हिन्दी)" },
  { code: "es", name: "Spanish (Español)" },
  { code: "fr", name: "French (Français)" },
  { code: "de", name: "German (Deutsch)" },
  { code: "ja", name: "Japanese (日本語)" },
  { code: "te", name: "Telugu (తెలుగు)" },
  { code: "ta", name: "Tamil (தமிழ்)" },
  { code: "ar", name: "Arabic (العربية)" },
  { code: "ru", name: "Russian (Русский)" },
];

interface CommentsProps {
  videoId?: string | string[] | any;
}

export default function Comments({ videoId }: CommentsProps) {
  const normalizedVideoId =
    typeof videoId === "string" ? videoId : Array.isArray(videoId) ? videoId[0] : "";

  const { user } = useUser();
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"newest" | "most_liked" | "relevant" | "oldest">("newest");

  // New Comment Input
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userLocation, setUserLocation] = useState("India");

  // Inline Editing
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Inline Replying
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // Expanded replies set
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});

  // Translation Cache & Preferred Language
  const [preferredLang, setPreferredLang] = useState<string>("en");
  const [translatedMap, setTranslatedMap] = useState<
    Record<string, { text: string; sourceLang: string; isOriginal: boolean }>
  >({});
  const [translatingIds, setTranslatingIds] = useState<Record<string, boolean>>({});

  // CAPTCHA Challenge State
  const [captchaChallenge, setCaptchaChallenge] = useState<{
    token: string;
    question: string;
  } | null>(null);
  const [captchaAnswer, setCaptchaAnswer] = useState("");

  // Report Modal State
  const [reportModalData, setReportModalData] = useState<{
    isOpen: boolean;
    commentId: string | null;
    author: string;
    content: string;
  }>({
    isOpen: false,
    commentId: null,
    author: "",
    content: "",
  });

  // Load user approximate location from timezone / geo
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      if (tz.includes("Kolkata") || tz.includes("Calcutta")) {
        setUserLocation("Mumbai, India");
      } else if (tz.includes("New_York")) {
        setUserLocation("New York, USA");
      } else if (tz.includes("London")) {
        setUserLocation("London, UK");
      } else if (tz.includes("Tokyo")) {
        setUserLocation("Tokyo, Japan");
      } else {
        setUserLocation("Global");
      }
    } catch {
      setUserLocation("India");
    }
  }, []);

  // Fetch comments
  const loadComments = useCallback(async () => {
    if (!normalizedVideoId) return;
    try {
      const res = await axiosInstance.get(`/comment/${normalizedVideoId}?sortBy=${sortBy}`);
      setComments(res.data || []);
    } catch (error) {
      console.error("Error loading comments:", error);
    } finally {
      setLoading(false);
    }
  }, [normalizedVideoId, sortBy]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  // Total comment count (root + replies)
  const totalCommentsCount = useMemo(() => {
    return comments.reduce((acc, c) => acc + 1 + (c.replies?.length || c.replyCount || 0), 0);
  }, [comments]);

  // 1. POST NEW COMMENT
  const handleSubmitComment = async () => {
    if (!user) {
      toast.error("Please sign in to comment");
      return;
    }
    if (!newComment.trim() || !normalizedVideoId) return;

    setIsSubmitting(true);
    try {
      const res = await axiosInstance.post("/comment/postcomment", {
        videoid: normalizedVideoId,
        userid: user._id,
        usercommented: user.name || "User",
        userimage: user.image || "",
        userlocation: userLocation,
        commentbody: newComment.trim(),
        captchaToken: captchaChallenge?.token,
        captchaAnswer: captchaAnswer.trim(),
      });

      if (res.data?.comment) {
        setNewComment("");
        setCaptchaChallenge(null);
        setCaptchaAnswer("");
        toast.success("Comment posted!");
        await loadComments();
      }
    } catch (error: any) {
      const errData = error.response?.data;
      if (errData?.requireCaptcha && errData?.captchaChallenge) {
        setCaptchaChallenge(errData.captchaChallenge);
        toast.warning(errData.message || "Please solve the security challenge to post.");
      } else {
        toast.error(errData?.message || "Failed to post comment.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. POST REPLY
  const handleSubmitReply = async (parentCommentId: string) => {
    if (!user) {
      toast.error("Please sign in to reply");
      return;
    }
    if (!replyText.trim()) return;

    setIsSubmittingReply(true);
    try {
      const res = await axiosInstance.post("/comment/postcomment", {
        videoid: normalizedVideoId,
        userid: user._id,
        usercommented: user.name || "User",
        userimage: user.image || "",
        userlocation: userLocation,
        commentbody: replyText.trim(),
        parentCommentId,
      });

      if (res.data?.comment) {
        setReplyText("");
        setReplyingToId(null);
        setExpandedReplies((prev) => ({ ...prev, [parentCommentId]: true }));
        toast.success("Reply posted!");
        await loadComments();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to post reply.");
    } finally {
      setIsSubmittingReply(false);
    }
  };

  // 3. EDIT COMMENT
  const handleStartEdit = (comment: CommentItem | ReplyItem) => {
    const postTime = new Date(comment.commentedon).getTime();
    const elapsedMinutes = differenceInMinutes(new Date(), postTime);

    if (elapsedMinutes > 15) {
      toast.error("Comments can only be edited within 15 minutes of posting.");
      return;
    }

    setEditingCommentId(comment._id);
    setEditText(comment.commentbody);
  };

  const handleSaveEdit = async () => {
    if (!editText.trim() || !editingCommentId) return;

    setIsUpdating(true);
    try {
      const res = await axiosInstance.post(`/comment/editcomment/${editingCommentId}`, {
        commentbody: editText.trim(),
        userid: user?._id,
      });

      if (res.data?._id) {
        toast.success("Comment updated");
        setEditingCommentId(null);
        setEditText("");
        await loadComments();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update comment.");
    } finally {
      setIsUpdating(false);
    }
  };

  // 4. DELETE COMMENT (With soft-delete support)
  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;

    try {
      const res = await axiosInstance.delete(`/comment/deletecomment/${commentId}`, {
        data: { userid: user?._id },
      });

      if (res.data?.comment) {
        if (res.data?.softDeleted) {
          toast.info("Comment content removed. Conversation replies kept intact.");
        } else {
          toast.success("Comment deleted");
        }
        await loadComments();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete comment.");
    }
  };

  // 5. LIKE & DISLIKE REACTIONS
  const handleLike = async (commentId: string) => {
    if (!user) {
      toast.error("Please sign in to react");
      return;
    }
    try {
      const res = await axiosInstance.post(`/comment/like/${commentId}`, {
        userid: user._id,
      });
      if (res.data?.success) {
        setComments((prev) =>
          prev.map((c) => {
            if (c._id === commentId) {
              return {
                ...c,
                likesCount: res.data.likesCount,
                dislikesCount: res.data.dislikesCount,
                likes: res.data.isLiked
                  ? [...(c.likes || []), user._id]
                  : (c.likes || []).filter((id) => id !== user._id),
                dislikes: (c.dislikes || []).filter((id) => id !== user._id),
              };
            }
            // Check replies
            if (c.replies?.some((r) => r._id === commentId)) {
              return {
                ...c,
                replies: c.replies.map((r) =>
                  r._id === commentId
                    ? {
                        ...r,
                        likesCount: res.data.likesCount,
                        dislikesCount: res.data.dislikesCount,
                        likes: res.data.isLiked
                          ? [...(r.likes || []), user._id]
                          : (r.likes || []).filter((id) => id !== user._id),
                        dislikes: (r.dislikes || []).filter((id) => id !== user._id),
                      }
                    : r
                ),
              };
            }
            return c;
          })
        );
      }
    } catch (e) {
      toast.error("Reaction failed");
    }
  };

  const handleDislike = async (commentId: string) => {
    if (!user) {
      toast.error("Please sign in to react");
      return;
    }
    try {
      const res = await axiosInstance.post(`/comment/dislike/${commentId}`, {
        userid: user._id,
      });
      if (res.data?.success) {
        setComments((prev) =>
          prev.map((c) => {
            if (c._id === commentId) {
              return {
                ...c,
                likesCount: res.data.likesCount,
                dislikesCount: res.data.dislikesCount,
                dislikes: res.data.isDisliked
                  ? [...(c.dislikes || []), user._id]
                  : (c.dislikes || []).filter((id) => id !== user._id),
                likes: (c.likes || []).filter((id) => id !== user._id),
              };
            }
            if (c.replies?.some((r) => r._id === commentId)) {
              return {
                ...c,
                replies: c.replies.map((r) =>
                  r._id === commentId
                    ? {
                        ...r,
                        likesCount: res.data.likesCount,
                        dislikesCount: res.data.dislikesCount,
                        dislikes: res.data.isDisliked
                          ? [...(r.dislikes || []), user._id]
                          : (r.dislikes || []).filter((id) => id !== user._id),
                        likes: (r.likes || []).filter((id) => id !== user._id),
                      }
                    : r
                ),
              };
            }
            return c;
          })
        );
      }
    } catch (e) {
      toast.error("Reaction failed");
    }
  };

  // 6. MULTILINGUAL TRANSLATION HANDLER
  const handleToggleTranslate = async (commentId: string, rawText: string) => {
    const existing = translatedMap[commentId];
    if (existing) {
      // Toggle between original and translated
      setTranslatedMap((prev) => ({
        ...prev,
        [commentId]: {
          ...existing,
          isOriginal: !existing.isOriginal,
        },
      }));
      return;
    }

    setTranslatingIds((prev) => ({ ...prev, [commentId]: true }));
    try {
      const res = await axiosInstance.post("/comment/translate", {
        text: rawText,
        targetLang: preferredLang,
      });

      if (res.data?.success) {
        setTranslatedMap((prev) => ({
          ...prev,
          [commentId]: {
            text: res.data.translatedText,
            sourceLang: res.data.detectedLanguage || "auto",
            isOriginal: false,
          },
        }));
      } else {
        toast.info(res.data?.message || "Translation unavailable.");
      }
    } catch {
      toast.error("Could not translate comment at this time.");
    } finally {
      setTranslatingIds((prev) => ({ ...prev, [commentId]: false }));
    }
  };

  // Helper to render text with clickable @mentions highlighted
  const renderCommentBodyWithMentions = (text: string) => {
    const parts = text.split(/(@[a-zA-Z0-9_\.-]+)/g);
    return parts.map((part, index) => {
      if (part.startsWith("@")) {
        return (
          <span
            key={index}
            className="font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          >
            {part}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  if (loading) {
    return (
      <div className="space-y-4 pt-4 animate-pulse">
        <div className="h-6 w-36 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
        <div className="flex gap-4 items-start">
          <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-40 bg-zinc-200 dark:bg-zinc-800 rounded" />
            <div className="h-4 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-4 text-zinc-900 dark:text-zinc-100">
      {/* Header with Total Count, Sort Selector & Preferred Language */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-4">
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            {totalCommentsCount} Comments
          </h2>

          {/* Sort Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-1.5 text-xs font-bold rounded-xl h-8 px-2.5 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>
                  Sort by:{" "}
                  {sortBy === "newest"
                    ? "Newest"
                    : sortBy === "most_liked"
                    ? "Top Comments"
                    : sortBy === "relevant"
                    ? "Most Relevant"
                    : "Oldest"}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44 rounded-2xl p-1 text-xs font-semibold">
              <DropdownMenuItem onClick={() => setSortBy("newest")}>
                Newest first
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("most_liked")}>
                Top / Most liked
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("relevant")}>
                Most relevant
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("oldest")}>
                Oldest first
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Global Preferred Translation Language Picker */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto text-xs text-zinc-500 dark:text-zinc-400">
          <Globe className="w-4 h-4 text-blue-500 shrink-0" />
          <span>Translate to:</span>
          <select
            value={preferredLang}
            onChange={(e) => {
              setPreferredLang(e.target.value);
              // Clear cache so comments can re-translate to new target language
              setTranslatedMap({});
            }}
            className="text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg px-2 py-1 text-zinc-800 dark:text-zinc-200 focus:outline-none cursor-pointer"
          >
            {TARGET_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Primary Comment Input Area */}
      {user ? (
        <div className="flex gap-3 sm:gap-4 items-start">
          <Avatar className="w-10 h-10 border border-zinc-200 dark:border-zinc-700 shrink-0 shadow-xs">
            <AvatarImage src={user.image || ""} />
            <AvatarFallback className="bg-red-600 text-white font-bold text-xs">
              {user.name?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 px-1">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300 truncate">
                Commenting as @{user.name?.toLowerCase().replace(/\s+/g, "") || "user"}
              </span>
              <span className="flex items-center gap-1 text-[10px] text-zinc-400 shrink-0">
                <MapPin className="w-3 h-3 text-red-500" />
                {userLocation}
              </span>
            </div>

            <Textarea
              placeholder="Add a comment... (Mentions like @username and multiple languages supported)"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[80px] text-sm resize-none rounded-2xl border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900 focus-visible:ring-1 focus-visible:ring-red-600 p-3"
            />

            {/* In-Line CAPTCHA Challenge if Rate-Limited */}
            {captchaChallenge && (
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 space-y-2 animate-in fade-in">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span>Security Verification Required</span>
                </div>
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  Please solve this challenge to verify you're human:{" "}
                  <strong className="text-sm font-mono">{captchaChallenge.question}</strong>
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Enter answer"
                    value={captchaAnswer}
                    onChange={(e) => setCaptchaAnswer(e.target.value)}
                    className="h-8 px-3 text-xs font-mono font-bold w-36 rounded-xl border border-amber-400 dark:border-amber-700 bg-white dark:bg-zinc-900"
                  />
                  <Button
                    size="sm"
                    onClick={handleSubmitComment}
                    disabled={!captchaAnswer.trim() || isSubmitting}
                    className="h-8 px-4 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl"
                  >
                    Verify & Post
                  </Button>
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end items-center pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setNewComment("");
                  setCaptchaChallenge(null);
                }}
                disabled={!newComment.trim()}
                className="rounded-full text-xs font-semibold h-8 px-3"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || isSubmitting}
                className="bg-red-600 hover:bg-red-700 text-white rounded-full px-5 text-xs font-bold h-8 shadow-sm"
              >
                {isSubmitting ? "Posting..." : "Comment"}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 text-center">
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
            Sign in to join the conversation, reply to discussions, and translate multilingual comments.
          </p>
        </div>
      )}

      {/* Comment List */}
      <div className="space-y-6 pt-2">
        {comments.length === 0 ? (
          <div className="text-center py-10 text-zinc-400 dark:text-zinc-500 space-y-2">
            <MessageSquare className="w-10 h-10 mx-auto opacity-30" />
            <p className="text-sm font-semibold">No comments yet.</p>
            <p className="text-xs">Be the first to share your thoughts!</p>
          </div>
        ) : (
          comments.map((comment) => {
            const isAuthor = user?._id && comment.userid === user._id;
            const hasLiked = user?._id && (comment.likes || []).includes(user._id);
            const hasDisliked = user?._id && (comment.dislikes || []).includes(user._id);

            const translation = translatedMap[comment._id];
            const isTranslating = translatingIds[comment._id];

            const displayText =
              translation && !translation.isOriginal
                ? translation.text
                : comment.commentbody;

            const postTime = new Date(comment.commentedon).getTime();
            const elapsedMins = differenceInMinutes(new Date(), postTime);
            const canEdit = isAuthor && !comment.isDeleted && elapsedMins <= 15;

            return (
              <div key={comment._id} className="space-y-3 group">
                <div className="flex gap-3 sm:gap-4 items-start">
                  {/* User Profile Avatar */}
                  <Avatar className="w-9 h-9 sm:w-10 sm:h-10 border border-zinc-200 dark:border-zinc-800 mt-0.5 shrink-0 shadow-xs">
                    <AvatarImage src={comment.userimage} />
                    <AvatarFallback className="bg-zinc-800 text-white text-xs font-bold">
                      {comment.usercommented?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    {/* Header: Username, Location, Relative Time, Edited Badge */}
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                      <span className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 truncate">
                        @{comment.usercommented?.toLowerCase().replace(/\s+/g, "") || "user"}
                      </span>

                      {/* Location Badge */}
                      {comment.userlocation && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.2 rounded-md">
                          <MapPin className="w-2.5 h-2.5 text-red-500" />
                          <span className="truncate max-w-[120px]">{comment.userlocation}</span>
                        </span>
                      )}

                      {/* Date & Time */}
                      <span
                        className="text-[11px] text-zinc-500 dark:text-zinc-400 cursor-default"
                        title={
                          comment.commentedon
                            ? format(new Date(comment.commentedon), "PPpp")
                            : ""
                        }
                      >
                        {comment.commentedon
                          ? formatDistanceToNow(new Date(comment.commentedon), { addSuffix: true })
                          : "recently"}
                      </span>

                      {/* Edited Badge */}
                      {comment.isEdited && (
                        <span
                          className="text-[10px] text-zinc-400 italic cursor-help"
                          title={
                            comment.editedAt
                              ? `Edited ${formatDistanceToNow(new Date(comment.editedAt), { addSuffix: true })}`
                              : "Edited"
                          }
                        >
                          (edited)
                        </span>
                      )}
                    </div>

                    {/* Inline Editing Form */}
                    {editingCommentId === comment._id ? (
                      <div className="space-y-2 mt-1.5">
                        <Textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="min-h-[70px] text-xs sm:text-sm rounded-xl p-2.5 border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                        />
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingCommentId(null);
                              setEditText("");
                            }}
                            className="rounded-xl text-xs h-7 px-3"
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSaveEdit}
                            disabled={!editText.trim() || isUpdating}
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs h-7 px-4 font-bold"
                          >
                            {isUpdating ? "Saving..." : "Save"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Comment Body */}
                        <p
                          className={`text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words ${
                            comment.isDeleted
                              ? "text-zinc-400 italic font-serif"
                              : "text-zinc-800 dark:text-zinc-200"
                          }`}
                        >
                          {comment.isDeleted
                            ? comment.commentbody
                            : renderCommentBodyWithMentions(displayText)}
                        </p>

                        {/* Translation Status Pill */}
                        {!comment.isDeleted && translation && (
                          <div className="flex items-center gap-1.5 text-[10px] text-blue-600 dark:text-blue-400 font-semibold mt-1">
                            <Globe className="w-3 h-3" />
                            <span>
                              {translation.isOriginal
                                ? `Original text`
                                : `Translated to ${TARGET_LANGUAGES.find((l) => l.code === preferredLang)?.name || preferredLang}`}
                            </span>
                          </div>
                        )}

                        {/* Action Toolbar */}
                        {!comment.isDeleted && (
                          <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                            {/* Like Button */}
                            <button
                              onClick={() => handleLike(comment._id)}
                              className={`flex items-center gap-1 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer ${
                                hasLiked ? "text-red-600 dark:text-red-500 font-bold" : ""
                              }`}
                              title="Like"
                            >
                              <ThumbsUp className={`w-3.5 h-3.5 ${hasLiked ? "fill-current" : ""}`} />
                              <span>{comment.likesCount || 0}</span>
                            </button>

                            {/* Dislike Button */}
                            <button
                              onClick={() => handleDislike(comment._id)}
                              className={`flex items-center gap-1 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer ${
                                hasDisliked ? "text-zinc-900 dark:text-white font-bold" : ""
                              }`}
                              title="Dislike"
                            >
                              <ThumbsDown className={`w-3.5 h-3.5 ${hasDisliked ? "fill-current" : ""}`} />
                            </button>

                            {/* Reply Trigger */}
                            <button
                              onClick={() => {
                                if (!user) {
                                  toast.error("Please sign in to reply");
                                  return;
                                }
                                setReplyingToId(
                                  replyingToId === comment._id ? null : comment._id
                                );
                                setReplyText(
                                  `@${comment.usercommented?.toLowerCase().replace(/\s+/g, "") || "user"} `
                                );
                              }}
                              className="font-bold hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                            >
                              Reply
                            </button>

                            {/* Built-in Translate Button */}
                            <button
                              onClick={() => handleToggleTranslate(comment._id, comment.commentbody)}
                              disabled={isTranslating}
                              className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                              title="Translate to preferred language"
                            >
                              <Globe className="w-3 h-3" />
                              <span>
                                {isTranslating
                                  ? "Translating..."
                                  : translation && !translation.isOriginal
                                  ? "See original"
                                  : "Translate"}
                              </span>
                            </button>

                            {/* More Actions Dropdown (Edit / Delete / Report) */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ml-auto opacity-0 group-hover:opacity-100 cursor-pointer">
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-36 rounded-xl text-xs">
                                {canEdit && (
                                  <DropdownMenuItem
                                    onClick={() => handleStartEdit(comment)}
                                    className="flex items-center gap-2 cursor-pointer"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" /> Edit
                                  </DropdownMenuItem>
                                )}
                                {isAuthor && (
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteComment(comment._id)}
                                    className="flex items-center gap-2 text-red-600 dark:text-red-400 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" /> Delete
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() =>
                                    setReportModalData({
                                      isOpen: true,
                                      commentId: comment._id,
                                      author: comment.usercommented || "User",
                                      content: comment.commentbody,
                                    })
                                  }
                                  className="flex items-center gap-2 text-amber-600 dark:text-amber-400 cursor-pointer"
                                >
                                  <Flag className="w-3.5 h-3.5" /> Report
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </>
                    )}

                    {/* Inline Reply Input Box */}
                    {replyingToId === comment._id && (
                      <div className="flex gap-2 sm:gap-3 items-start mt-3 pl-2 sm:pl-4 border-l-2 border-red-500 animate-in fade-in">
                        <Avatar className="w-7 h-7 sm:w-8 sm:h-8 border shrink-0">
                          <AvatarImage src={user?.image || ""} />
                          <AvatarFallback className="text-[10px] bg-red-600 text-white">
                            {user?.name?.[0] || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1.5">
                          <Textarea
                            autoFocus
                            placeholder={`Reply to @${comment.usercommented}...`}
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            className="min-h-[60px] text-xs rounded-xl p-2 border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
                          />
                          <div className="flex justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setReplyingToId(null);
                                setReplyText("");
                              }}
                              className="rounded-xl text-xs h-7 px-3"
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleSubmitReply(comment._id)}
                              disabled={!replyText.trim() || isSubmittingReply}
                              className="bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs h-7 px-4 font-bold"
                            >
                              {isSubmittingReply ? "Replying..." : "Reply"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Accordion Toggle for Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="mt-2.5">
                        <button
                          onClick={() =>
                            setExpandedReplies((prev) => ({
                              ...prev,
                              [comment._id]: !prev[comment._id],
                            }))
                          }
                          className="flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 px-2 py-1 rounded-full transition-colors cursor-pointer"
                        >
                          {expandedReplies[comment._id] ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                          <span>
                            {expandedReplies[comment._id]
                              ? `Hide ${comment.replies.length} ${
                                  comment.replies.length === 1 ? "reply" : "replies"
                                }`
                              : `View ${comment.replies.length} ${
                                  comment.replies.length === 1 ? "reply" : "replies"
                                }`}
                          </span>
                        </button>

                        {/* Nested Replies Thread */}
                        {expandedReplies[comment._id] && (
                          <div className="pl-4 sm:pl-6 border-l-2 border-zinc-200 dark:border-zinc-800 space-y-4 mt-3">
                            {comment.replies.map((reply) => {
                              const isReplyAuthor = user?._id && reply.userid === user._id;
                              const replyHasLiked =
                                user?._id && (reply.likes || []).includes(user._id);
                              const replyHasDisliked =
                                user?._id && (reply.dislikes || []).includes(user._id);

                              const replyTranslation = translatedMap[reply._id];
                              const isReplyTranslating = translatingIds[reply._id];
                              const replyDisplayText =
                                replyTranslation && !replyTranslation.isOriginal
                                  ? replyTranslation.text
                                  : reply.commentbody;

                              const replyPostTime = new Date(reply.commentedon).getTime();
                              const replyElapsedMins = differenceInMinutes(
                                new Date(),
                                replyPostTime
                              );
                              const canEditReply =
                                isReplyAuthor && !reply.isDeleted && replyElapsedMins <= 15;

                              return (
                                <div key={reply._id} className="flex gap-2.5 sm:gap-3 items-start group/reply">
                                  <Avatar className="w-7 h-7 sm:w-8 sm:h-8 border border-zinc-200 dark:border-zinc-800 shrink-0">
                                    <AvatarImage src={reply.userimage} />
                                    <AvatarFallback className="bg-zinc-700 text-white text-[10px] font-bold">
                                      {reply.usercommented?.[0]?.toUpperCase() || "U"}
                                    </AvatarFallback>
                                  </Avatar>

                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                      <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate">
                                        @{reply.usercommented?.toLowerCase().replace(/\s+/g, "") || "user"}
                                      </span>

                                      {reply.userlocation && (
                                        <span className="inline-flex items-center gap-0.5 text-[9px] text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1 py-0.2 rounded">
                                          <MapPin className="w-2.5 h-2.5 text-red-500" />
                                          <span className="truncate max-w-[100px]">{reply.userlocation}</span>
                                        </span>
                                      )}

                                      <span className="text-[10px] text-zinc-400">
                                        {formatDistanceToNow(new Date(reply.commentedon), { addSuffix: true })}
                                      </span>

                                      {reply.isEdited && (
                                        <span className="text-[9px] text-zinc-400 italic">
                                          (edited)
                                        </span>
                                      )}
                                    </div>

                                    {/* Inline Edit Form for Reply */}
                                    {editingCommentId === reply._id ? (
                                      <div className="space-y-1.5 mt-1">
                                        <Textarea
                                          value={editText}
                                          onChange={(e) => setEditText(e.target.value)}
                                          className="min-h-[50px] text-xs rounded-xl p-2"
                                        />
                                        <div className="flex gap-1.5 justify-end">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                              setEditingCommentId(null);
                                              setEditText("");
                                            }}
                                            className="text-xs h-6 px-2.5 rounded-lg"
                                          >
                                            Cancel
                                          </Button>
                                          <Button
                                            size="sm"
                                            onClick={handleSaveEdit}
                                            disabled={!editText.trim() || isUpdating}
                                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-6 px-3 rounded-lg font-bold"
                                          >
                                            Save
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        <p
                                          className={`text-xs leading-relaxed whitespace-pre-wrap break-words ${
                                            reply.isDeleted
                                              ? "text-zinc-400 italic"
                                              : "text-zinc-800 dark:text-zinc-200"
                                          }`}
                                        >
                                          {reply.isDeleted
                                            ? reply.commentbody
                                            : renderCommentBodyWithMentions(replyDisplayText)}
                                        </p>

                                        {!reply.isDeleted && (
                                          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-zinc-500">
                                            <button
                                              onClick={() => handleLike(reply._id)}
                                              className={`flex items-center gap-1 cursor-pointer hover:text-zinc-900 dark:hover:text-white ${
                                                replyHasLiked ? "text-red-600 font-bold" : ""
                                              }`}
                                            >
                                              <ThumbsUp className={`w-3 h-3 ${replyHasLiked ? "fill-current" : ""}`} />
                                              <span>{reply.likesCount || 0}</span>
                                            </button>

                                            <button
                                              onClick={() => handleDislike(reply._id)}
                                              className={`flex items-center gap-1 cursor-pointer hover:text-zinc-900 dark:hover:text-white ${
                                                replyHasDisliked ? "text-zinc-900 font-bold" : ""
                                              }`}
                                            >
                                              <ThumbsDown className={`w-3 h-3 ${replyHasDisliked ? "fill-current" : ""}`} />
                                            </button>

                                            <button
                                              onClick={() =>
                                                handleToggleTranslate(reply._id, reply.commentbody)
                                              }
                                              disabled={isReplyTranslating}
                                              className="flex items-center gap-0.5 text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                                            >
                                              <Globe className="w-2.5 h-2.5" />
                                              <span>
                                                {isReplyTranslating
                                                  ? "Translating..."
                                                  : replyTranslation && !replyTranslation.isOriginal
                                                  ? "See original"
                                                  : "Translate"}
                                              </span>
                                            </button>

                                            {/* Reply More Actions */}
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <button className="p-0.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 ml-auto opacity-0 group-hover/reply:opacity-100 cursor-pointer">
                                                  <MoreVertical className="w-3 h-3" />
                                                </button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent align="end" className="w-32 rounded-xl text-xs">
                                                {canEditReply && (
                                                  <DropdownMenuItem onClick={() => handleStartEdit(reply)}>
                                                    <Edit2 className="w-3 h-3 mr-1.5" /> Edit
                                                  </DropdownMenuItem>
                                                )}
                                                {isReplyAuthor && (
                                                  <DropdownMenuItem
                                                    onClick={() => handleDeleteComment(reply._id)}
                                                    className="text-red-600"
                                                  >
                                                    <Trash2 className="w-3 h-3 mr-1.5" /> Delete
                                                  </DropdownMenuItem>
                                                )}
                                                <DropdownMenuItem
                                                  onClick={() =>
                                                    setReportModalData({
                                                      isOpen: true,
                                                      commentId: reply._id,
                                                      author: reply.usercommented || "User",
                                                      content: reply.commentbody,
                                                    })
                                                  }
                                                  className="text-amber-600"
                                                >
                                                  <Flag className="w-3 h-3 mr-1.5" /> Report
                                                </DropdownMenuItem>
                                              </DropdownMenuContent>
                                            </DropdownMenu>
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Report Modal */}
      <ReportCommentModal
        isOpen={reportModalData.isOpen}
        onClose={() =>
          setReportModalData({ isOpen: false, commentId: null, author: "", content: "" })
        }
        commentId={reportModalData.commentId}
        commentAuthor={reportModalData.author}
        commentContent={reportModalData.content}
        userId={user?._id}
      />
    </div>
  );
}
