import mongoose from "mongoose";

const commentReportSchema = mongoose.Schema(
  {
    commentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "comment",
      required: true,
    },
    videoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "videofiles",
      required: true,
    },
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    commentAuthorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },
    commentContentSnapshot: {
      type: String,
      required: true,
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
      required: true,
    },
    details: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "reviewed", "dismissed", "removed"],
      default: "pending",
    },
    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },
    moderatedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

commentReportSchema.index({ commentId: 1, reporterId: 1 }, { unique: true });

export default mongoose.model("commentReport", commentReportSchema);
