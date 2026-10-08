import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "sonner";
import { ThumbsUp, ThumbsDown, MessageSquare } from "lucide-react";

interface Comment {
  _id: string;
  videoid: string;
  userid: string;
  commentbody: string;
  usercommented: string;
  commentedon: string;
}

const Comments = ({ videoId }: any) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const { user } = useUser();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (videoId) {
      loadComments();
    }
  }, [videoId]);

  const loadComments = async () => {
    try {
      const res = await axiosInstance.get(`/comment/${videoId}`);
      setComments(res.data || []);
    } catch (error) {
      console.error("Error loading comments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!user) {
      toast.error("Please sign in to comment");
      return;
    }
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      await axiosInstance.post("/comment/postcomment", {
        videoid: videoId,
        userid: user._id,
        commentbody: newComment.trim(),
        usercommented: user.name || "User",
      });
      setNewComment("");
      await loadComments();
      toast.success("Comment posted");
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Failed to post comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (comment: Comment) => {
    setEditingCommentId(comment._id);
    setEditText(comment.commentbody);
  };

  const handleUpdateComment = async () => {
    if (!editText.trim() || !editingCommentId) return;
    try {
      await axiosInstance.post(
        `/comment/editcomment/${editingCommentId}`,
        { commentbody: editText.trim() }
      );
      setComments((prev) =>
        prev.map((c) =>
          c._id === editingCommentId ? { ...c, commentbody: editText.trim() } : c
        )
      );
      setEditingCommentId(null);
      setEditText("");
      toast.success("Comment updated");
    } catch (error) {
      console.error("Error updating comment:", error);
      toast.error("Failed to update comment");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await axiosInstance.delete(`/comment/deletecomment/${id}`);
      setComments((prev) => prev.filter((c) => c._id !== id));
      toast.success("Comment deleted");
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error("Failed to delete comment");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 pt-4 animate-pulse">
        <div className="h-6 w-36 bg-gray-200 rounded"></div>
        <div className="flex gap-4 items-start">
          <div className="w-10 h-10 rounded-full bg-gray-200"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 w-40 bg-gray-200 rounded"></div>
            <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-2">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold">{comments.length} Comments</h2>
      </div>

      {user ? (
        <div className="flex gap-4 items-start">
          <Avatar className="w-10 h-10 border">
            <AvatarImage src={user.image || ""} />
            <AvatarFallback className="bg-red-600 text-white font-semibold">
              {user.name?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Textarea
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e: any) => setNewComment(e.target.value)}
              className="min-h-[75px] resize-none border-0 border-b-2 rounded-none focus-visible:ring-0 px-1 py-1.5 focus:border-black transition-colors"
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setNewComment("")}
                disabled={!newComment.trim()}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-4"
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || isSubmitting}
              >
                {isSubmitting ? "Posting..." : "Comment"}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 border rounded-xl p-4 text-center">
          <p className="text-sm text-gray-600 mb-2">
            Sign in to join the conversation and leave a comment.
          </p>
        </div>
      )}

      <div className="space-y-4 pt-2">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No comments yet. Be the first to comment!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment._id} className="flex gap-4 group">
              <Avatar className="w-10 h-10 border mt-0.5">
                <AvatarFallback className="bg-neutral-800 text-white text-xs font-semibold">
                  {comment.usercommented?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-xs text-neutral-900">
                    @{comment.usercommented?.toLowerCase().replace(/\s+/g, "") || "user"}
                  </span>
                  <span className="text-xs text-gray-500">
                    {comment.commentedon ? (
                      (() => {
                        try {
                          return formatDistanceToNow(new Date(comment.commentedon), {
                            addSuffix: true,
                          });
                        } catch {
                          return "recently";
                        }
                      })()
                    ) : (
                      "recently"
                    )}
                  </span>
                </div>

                {editingCommentId === comment._id ? (
                  <div className="space-y-2 mt-1">
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="min-h-[60px]"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingCommentId(null);
                          setEditText("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={handleUpdateComment}
                        disabled={!editText.trim()}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-neutral-800 leading-relaxed whitespace-pre-wrap">
                      {comment.commentbody}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                      <button
                        className="flex items-center gap-1 hover:text-black transition-colors"
                        onClick={() => toast.info("Liked comment")}
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        className="hover:text-black transition-colors"
                        onClick={() => toast.info("Disliked comment")}
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        className="font-medium hover:text-black transition-colors"
                        onClick={() => {
                          if (!user) toast.error("Please sign in to reply");
                          else toast.info("Reply feature coming soon!");
                        }}
                      >
                        Reply
                      </button>

                      {comment.userid === user?._id && (
                        <div className="flex items-center gap-2 ml-2 pl-2 border-l border-gray-200">
                          <button
                            onClick={() => handleEdit(comment)}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(comment._id)}
                            className="text-xs text-red-500 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Comments;
