import multer from "multer";
import fs from "fs";
import path from "path";

const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
    cb(null, `meet-${uniqueSuffix}-${baseName}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  // Allow common meeting file types: images, pdfs, text, audio, video, zip, docs
  cb(null, true);
};

export const meetingUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
});
