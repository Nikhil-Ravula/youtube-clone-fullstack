import mongoose from "mongoose";
const historyschema = mongoose.Schema(
  {
    viewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    videoid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "videofiles",
      required: true,
    },
    likedon: { type: Date, default: Date.now },
    watchProgress: { type: Number, default: 0 },
    watchPercentage: { type: Number, default: 0 },
    isCompleted: { type: Boolean, default: false },
    lastWatchedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("history", historyschema);
