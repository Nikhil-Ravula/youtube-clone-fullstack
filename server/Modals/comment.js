import mongoose from "mongoose";

const commentschema = mongoose.Schema(
  {
    userid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    videoid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "videofiles",
      required: true,
    },
    commentbody: {
      type: String,
      required: true,
    },
    usercommented: {
      type: String,
      required: true,
    },
    userimage: {
      type: String,
      default: "",
    },
    userlocation: {
      type: String,
      default: "India",
    },
    commentedon: {
      type: Date,
      default: Date.now,
    },
    parentCommentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "comment",
      default: null,
    },
    replyCount: {
      type: Number,
      default: 0,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
      },
    ],
    dislikes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
      },
    ],
    likesCount: {
      type: Number,
      default: 0,
    },
    dislikesCount: {
      type: Number,
      default: 0,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
    },
    editHistory: [
      {
        text: String,
        editedAt: { type: Date, default: Date.now },
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
    },
    mentions: [
      {
        type: String,
      },
    ],
    language: {
      type: String,
      default: "auto",
    },
    isFlagged: {
      type: Boolean,
      default: false,
    },
    reportCount: {
      type: Number,
      default: 0,
    },
    reports: [
      {
        reporterId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "user",
        },
        reason: {
          type: String,
          enum: [
            "spam",
            "harassment",
            "offensive",
            "misinformation",
            "malicious_link",
            "hate_speech",
          ],
        },
        details: String,
        reportedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes for fast lookup and sorting
commentschema.index({ videoid: 1, parentCommentId: 1, commentedon: -1 });
commentschema.index({ videoid: 1, likesCount: -1 });

export default mongoose.model("comment", commentschema);
