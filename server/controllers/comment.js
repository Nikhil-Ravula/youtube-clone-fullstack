import comment from "../Modals/comment.js";
import commentReport from "../Modals/commentReport.js";
import mongoose from "mongoose";
import {
  checkProfanity,
  checkSpam,
  checkRateLimit,
  recordCommentSubmission,
  generateCaptcha,
  verifyCaptcha,
  extractMentions,
} from "../utils/commentModeration.js";
import { translateText, SUPPORTED_LANGUAGES } from "../utils/translationService.js";

/**
 * 1. Post a new comment or threaded reply
 */
export const postcomment = async (req, res) => {
  const {
    videoid,
    userid,
    commentbody,
    usercommented,
    userimage,
    userlocation,
    parentCommentId,
    captchaToken,
    captchaAnswer,
  } = req.body;

  if (!commentbody || !commentbody.trim()) {
    return res.status(400).json({ message: "Comment text cannot be empty." });
  }

  if (!userid || !videoid) {
    return res.status(400).json({ message: "User ID and Video ID are required." });
  }

  const clientIp =
    req.headers["x-forwarded-for"] ||
    req.socket?.remoteAddress ||
    "127.0.0.1";

  try {
    // 1. CAPTCHA verification if challenged
    if (captchaToken) {
      const isCaptchaValid = verifyCaptcha(captchaToken, captchaAnswer);
      if (!isCaptchaValid) {
        const freshCaptcha = generateCaptcha();
        return res.status(400).json({
          message: "Incorrect CAPTCHA answer. Please solve the new challenge.",
          requireCaptcha: true,
          captchaChallenge: freshCaptcha,
        });
      }
    } else {
      // 2. Rate limiting & flooding check
      const rateLimitStatus = checkRateLimit(userid || clientIp);
      if (rateLimitStatus.isRateLimited) {
        const captchaChallenge = generateCaptcha();
        return res.status(429).json({
          message: `You are commenting too quickly. Please wait ${rateLimitStatus.remainingSeconds}s or complete the CAPTCHA.`,
          requireCaptcha: true,
          captchaChallenge,
        });
      }
    }

    // 3. Profanity & Abusive Language Filter
    const profanityResult = checkProfanity(commentbody);
    if (profanityResult.isAbusive) {
      return res.status(400).json({
        message: profanityResult.reason,
        isAbusive: true,
      });
    }

    // 4. Spam, Link Abuse, Duplicate & Flooding Filter
    const spamResult = checkSpam(commentbody, userid, videoid);
    if (spamResult.isSpam) {
      return res.status(400).json({
        message: spamResult.reason,
        isSpam: true,
      });
    }

    // 5. Extract @mentions
    const mentions = extractMentions(commentbody);

    const newComment = new comment({
      videoid,
      userid,
      usercommented: usercommented || "User",
      userimage: userimage || "",
      userlocation: userlocation || "India",
      commentbody: commentbody.trim(),
      parentCommentId: parentCommentId || null,
      mentions,
      commentedon: new Date(),
    });

    await newComment.save();

    // 6. If this is a reply to a parent comment, increment parent replyCount
    if (parentCommentId && mongoose.Types.ObjectId.isValid(parentCommentId)) {
      await comment.findByIdAndUpdate(parentCommentId, {
        $inc: { replyCount: 1 },
      });
    }

    // Record submission to duplicate cache
    recordCommentSubmission(commentbody, userid, videoid);

    return res.status(200).json({
      comment: true,
      result: newComment,
    });
  } catch (error) {
    console.error("Error posting comment:", error);
    return res.status(500).json({ message: "Failed to post comment." });
  }
};

/**
 * 2. Get all top-level comments for a video with sorting & reply count
 */
export const getallcomment = async (req, res) => {
  const { videoid } = req.params;
  const { sortBy = "newest" } = req.query;

  try {
    let sortQuery = { commentedon: -1 };
    if (sortBy === "oldest") {
      sortQuery = { commentedon: 1 };
    } else if (sortBy === "most_liked") {
      sortQuery = { likesCount: -1, commentedon: -1 };
    } else if (sortBy === "relevant") {
      sortQuery = { replyCount: -1, likesCount: -1, commentedon: -1 };
    }

    // Find root comments (where parentCommentId is null)
    const rootComments = await comment
      .find({ videoid, parentCommentId: null })
      .sort(sortQuery)
      .lean();

    // Also populate top replies (up to 3) for each root comment for instant display
    const commentIds = rootComments.map((c) => c._id);
    const replies = await comment
      .find({ parentCommentId: { $in: commentIds } })
      .sort({ commentedon: 1 })
      .lean();

    const repliesMap = new Map();
    for (const reply of replies) {
      const pid = reply.parentCommentId.toString();
      if (!repliesMap.has(pid)) repliesMap.set(pid, []);
      repliesMap.get(pid).push(reply);
    }

    const commentsWithReplies = rootComments.map((c) => ({
      ...c,
      replies: repliesMap.get(c._id.toString()) || [],
    }));

    return res.status(200).json(commentsWithReplies);
  } catch (error) {
    console.error("Error getting comments:", error);
    return res.status(500).json({ message: "Failed to load comments." });
  }
};

/**
 * 3. Get replies for a specific parent comment
 */
export const getcommentreplies = async (req, res) => {
  const { parentCommentId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(parentCommentId)) {
    return res.status(400).json({ message: "Invalid parent comment ID" });
  }

  try {
    const replies = await comment
      .find({ parentCommentId })
      .sort({ commentedon: 1 })
      .lean();

    return res.status(200).json(replies);
  } catch (error) {
    console.error("Error getting replies:", error);
    return res.status(500).json({ message: "Failed to load replies." });
  }
};

/**
 * 4. Edit a comment within specified time limit (15 minutes)
 */
export const editcomment = async (req, res) => {
  const { id: _id } = req.params;
  const { commentbody, userid } = req.body;

  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).json({ message: "Comment not found." });
  }

  if (!commentbody || !commentbody.trim()) {
    return res.status(400).json({ message: "Comment text cannot be empty." });
  }

  try {
    const existing = await comment.findById(_id);
    if (!existing) {
      return res.status(404).json({ message: "Comment not found." });
    }

    if (existing.isDeleted) {
      return res.status(400).json({ message: "Deleted comments cannot be edited." });
    }

    // Verify authorship
    if (userid && existing.userid.toString() !== userid.toString()) {
      return res.status(403).json({ message: "You can only edit your own comments." });
    }

    // Check 15-minute edit window limit
    const postTime = new Date(existing.commentedon).getTime();
    const elapsedMinutes = (Date.now() - postTime) / (60 * 1000);
    const EDIT_LIMIT_MINUTES = 15;

    if (elapsedMinutes > EDIT_LIMIT_MINUTES) {
      return res.status(400).json({
        message: `Comments can only be edited within ${EDIT_LIMIT_MINUTES} minutes of posting to preserve discussion integrity.`,
      });
    }

    // Check profanity and spam on new text
    const profanityResult = checkProfanity(commentbody);
    if (profanityResult.isAbusive) {
      return res.status(400).json({ message: profanityResult.reason });
    }
    const spamResult = checkSpam(commentbody);
    if (spamResult.isSpam) {
      return res.status(400).json({ message: spamResult.reason });
    }

    // Preserve previous version in edit history
    existing.editHistory.push({
      text: existing.commentbody,
      editedAt: new Date(),
    });

    existing.commentbody = commentbody.trim();
    existing.isEdited = true;
    existing.editedAt = new Date();
    existing.mentions = extractMentions(commentbody);

    await existing.save();

    return res.status(200).json(existing);
  } catch (error) {
    console.error("Error editing comment:", error);
    return res.status(500).json({ message: "Failed to edit comment." });
  }
};

/**
 * 5. Delete comment with soft-delete handling for parent comments with replies
 */
export const deletecomment = async (req, res) => {
  const { id: _id } = req.params;
  const { userid } = req.body;

  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).json({ message: "Comment not found." });
  }

  try {
    const target = await comment.findById(_id);
    if (!target) {
      return res.status(404).json({ message: "Comment not found." });
    }

    // Check authorship
    if (userid && target.userid.toString() !== userid.toString()) {
      return res.status(403).json({ message: "You can only delete your own comments." });
    }

    // Check if this comment has existing replies
    const hasReplies =
      target.replyCount > 0 ||
      (await comment.countDocuments({ parentCommentId: _id })) > 0;

    if (hasReplies) {
      // Soft-delete: replace text with placeholder, retain child replies
      target.isDeleted = true;
      target.commentbody = "[This comment was deleted by the author]";
      target.isEdited = false;
      await target.save();

      return res.status(200).json({
        comment: true,
        softDeleted: true,
        message: "Comment marked as deleted. Replies preserved.",
      });
    }

    // Hard-delete if 0 replies
    await comment.findByIdAndDelete(_id);

    // If it was a reply, decrement parent replyCount
    if (target.parentCommentId) {
      await comment.findByIdAndUpdate(target.parentCommentId, {
        $inc: { replyCount: -1 },
      });
    }

    return res.status(200).json({
      comment: true,
      softDeleted: false,
      message: "Comment deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return res.status(500).json({ message: "Failed to delete comment." });
  }
};

/**
 * 6. Like comment toggle
 */
export const likecomment = async (req, res) => {
  const { id: _id } = req.params;
  const { userid } = req.body;

  if (!mongoose.Types.ObjectId.isValid(_id) || !userid) {
    return res.status(400).json({ message: "Invalid comment or user ID" });
  }

  try {
    const target = await comment.findById(_id);
    if (!target) return res.status(404).json({ message: "Comment not found" });

    const userObjId = new mongoose.Types.ObjectId(userid);
    const hasLiked = target.likes.some((id) => id.toString() === userid.toString());
    const hasDisliked = target.dislikes.some((id) => id.toString() === userid.toString());

    if (hasLiked) {
      // Remove like
      target.likes = target.likes.filter((id) => id.toString() !== userid.toString());
      target.likesCount = Math.max(0, target.likes.length);
    } else {
      // Add like and remove dislike if present
      target.likes.push(userObjId);
      target.likesCount = target.likes.length;
      if (hasDisliked) {
        target.dislikes = target.dislikes.filter((id) => id.toString() !== userid.toString());
        target.dislikesCount = Math.max(0, target.dislikes.length);
      }
    }

    await target.save();

    return res.status(200).json({
      success: true,
      likesCount: target.likesCount,
      dislikesCount: target.dislikesCount,
      isLiked: !hasLiked,
      isDisliked: false,
    });
  } catch (error) {
    console.error("Error liking comment:", error);
    return res.status(500).json({ message: "Failed to like comment." });
  }
};

/**
 * 7. Dislike comment toggle
 */
export const dislikecomment = async (req, res) => {
  const { id: _id } = req.params;
  const { userid } = req.body;

  if (!mongoose.Types.ObjectId.isValid(_id) || !userid) {
    return res.status(400).json({ message: "Invalid comment or user ID" });
  }

  try {
    const target = await comment.findById(_id);
    if (!target) return res.status(404).json({ message: "Comment not found" });

    const userObjId = new mongoose.Types.ObjectId(userid);
    const hasLiked = target.likes.some((id) => id.toString() === userid.toString());
    const hasDisliked = target.dislikes.some((id) => id.toString() === userid.toString());

    if (hasDisliked) {
      // Remove dislike
      target.dislikes = target.dislikes.filter((id) => id.toString() !== userid.toString());
      target.dislikesCount = Math.max(0, target.dislikes.length);
    } else {
      // Add dislike and remove like if present
      target.dislikes.push(userObjId);
      target.dislikesCount = target.dislikes.length;
      if (hasLiked) {
        target.likes = target.likes.filter((id) => id.toString() !== userid.toString());
        target.likesCount = Math.max(0, target.likes.length);
      }
    }

    await target.save();

    return res.status(200).json({
      success: true,
      likesCount: target.likesCount,
      dislikesCount: target.dislikesCount,
      isLiked: false,
      isDisliked: !hasDisliked,
    });
  } catch (error) {
    console.error("Error disliking comment:", error);
    return res.status(500).json({ message: "Failed to dislike comment." });
  }
};

/**
 * 8. Report inappropriate comment with predefined reasons
 * Flags for administrator review (does NOT auto-delete based on dislikes/reports)
 */
export const reportcomment = async (req, res) => {
  const { id: _id } = req.params;
  const { reporterId, reason, details = "" } = req.body;

  if (!mongoose.Types.ObjectId.isValid(_id) || !reporterId || !reason) {
    return res.status(400).json({ message: "Comment ID, reporter ID, and reason are required." });
  }

  try {
    const target = await comment.findById(_id);
    if (!target) return res.status(404).json({ message: "Comment not found" });

    // Edge case: Prevent duplicate reports by the same user
    const existingReport = await commentReport.findOne({
      commentId: _id,
      reporterId,
    });

    if (existingReport) {
      return res.status(400).json({
        message: "You have already reported this comment. Our moderation team is actively reviewing it.",
        duplicate: true,
      });
    }

    // Create moderation report log record
    await commentReport.create({
      commentId: _id,
      videoId: target.videoid,
      reporterId,
      commentAuthorId: target.userid,
      commentContentSnapshot: target.commentbody,
      reason,
      details,
      status: "pending",
    });

    // Flag comment and increment report counter on comment document
    target.isFlagged = true;
    target.reportCount = (target.reportCount || 0) + 1;
    target.reports.push({
      reporterId,
      reason,
      details,
      reportedAt: new Date(),
    });

    await target.save();

    return res.status(200).json({
      success: true,
      message: "Comment reported. Thank you for helping keep our community safe.",
    });
  } catch (error) {
    console.error("Error reporting comment:", error);
    return res.status(500).json({ message: "Failed to submit comment report." });
  }
};

/**
 * 9. Multilingual Translation Endpoint
 */
export const translatecomment = async (req, res) => {
  const { text, targetLang = "en", sourceLang = "auto" } = req.body;

  if (!text) {
    return res.status(400).json({ message: "Text to translate is required." });
  }

  try {
    const result = await translateText({ text, targetLang, sourceLang });
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error translating comment:", error);
    return res.status(500).json({
      success: false,
      translatedText: text,
      message: "Translation service temporarily unavailable.",
    });
  }
};

/**
 * 10. Get fresh CAPTCHA challenge
 */
export const getcaptchachallenge = async (req, res) => {
  try {
    const challenge = generateCaptcha();
    return res.status(200).json(challenge);
  } catch (error) {
    console.error("Error generating CAPTCHA:", error);
    return res.status(500).json({ message: "Failed to generate CAPTCHA." });
  }
};

/**
 * 11. Supported Languages list
 */
export const getsupportedlanguages = async (req, res) => {
  return res.status(200).json(SUPPORTED_LANGUAGES);
};
