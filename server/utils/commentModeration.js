import crypto from "crypto";

// Profanity / Abusive words list in English & Hindi/Hinglish
const PROFANITY_WORDS = [
  // English abusive terms
  "fuck",
  "shit",
  "bitch",
  "asshole",
  "cunt",
  "dick",
  "bastard",
  "motherfucker",
  "fucker",
  "whore",
  "slut",
  "fag",
  "faggot",
  "nigger",
  "nigga",
  "retard",
  "dumbass",
  "kill yourself",
  "kys",
  // Hindi / Hinglish abusive terms
  "bhenchod",
  "madarchod",
  "chutiya",
  "gandu",
  "harami",
  "randi",
  "bhosdike",
  "saala kutta",
  "kutiya",
  "lauda",
  "lodu",
  "chutmarike",
  "bhadwe",
  "gaand",
];

// In-memory sliding window for rate limiting & flood control
// Key: userId or IP -> timestamps array
const commentRateLimits = new Map();

// In-memory duplicate comment cache: key = `${userId}_${videoId}` -> { text, timestamp }
const duplicateCache = new Map();

// In-memory CAPTCHA challenges: token -> { answer, expiresAt }
const captchaStore = new Map();

/**
 * Normalizes text to detect leetspeak and obfuscated abuse
 */
const normalizeText = (text) => {
  return text
    .toLowerCase()
    .replace(/[@]/g, "a")
    .replace(/[\$]/g, "s")
    .replace(/[0]/g, "o")
    .replace(/[1!]/g, "i")
    .replace(/[3]/g, "e")
    .replace(/[\*\_\-\.\s]/g, "");
};

/**
 * Checks for profanity and abusive language
 */
export const checkProfanity = (text) => {
  if (!text) return { isAbusive: false };

  const rawLower = text.toLowerCase();
  const normalized = normalizeText(text);

  for (const word of PROFANITY_WORDS) {
    const cleanWord = word.replace(/\s+/g, "");
    // Check in raw string with word boundary
    const regex = new RegExp(`\\b${word}\\b`, "i");
    if (regex.test(rawLower) || normalized.includes(cleanWord)) {
      return {
        isAbusive: true,
        matchedWord: word,
        reason: "Your comment contains abusive or inappropriate language.",
      };
    }
  }

  return { isAbusive: false };
};

/**
 * Checks for spam, link abuse, and excessive emoji/character flooding
 */
export const checkSpam = (text, userId, videoId) => {
  if (!text) return { isSpam: false };

  // 1. Check for malicious links / unsolicited URLs
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.(xyz|top|crypto|ru|tk|ga|cf|gq|club|work|link)\b)/gi;
  if (urlRegex.test(text)) {
    return {
      isSpam: true,
      reason: "Posting external links or promotional URLs is not allowed in comments.",
    };
  }

  // 2. Check for repeated special characters flooding (e.g. !!!!!!!, ???????, .......)
  const repeatedPunctuation = /([!?.,~*#@$%^&=-])\1{5,}/;
  if (repeatedPunctuation.test(text)) {
    return {
      isSpam: true,
      reason: "Comment contains excessive repeated punctuation or symbols.",
    };
  }

  // 3. Check for repetitive character flooding (e.g. aaaaaaaaaaaa, loooooool)
  const repetitiveChars = /([a-zA-Z])\1{7,}/i;
  if (repetitiveChars.test(text)) {
    return {
      isSpam: true,
      reason: "Comment contains excessive repetitive characters.",
    };
  }

  // 4. Check for emoji flooding (> 7 emojis where emojis make up > 60% of content)
  const emojiRegex = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu;
  const emojis = text.match(emojiRegex);
  if (emojis && emojis.length >= 8) {
    const textWithoutEmojis = text.replace(emojiRegex, "").trim();
    if (textWithoutEmojis.length < emojis.length) {
      return {
        isSpam: true,
        reason: "Comment contains excessive emoji flooding.",
      };
    }
  }

  // 5. Check for duplicate comments by the same user within 15 minutes
  if (userId && videoId) {
    const cacheKey = `${userId}_${videoId}`;
    const previous = duplicateCache.get(cacheKey);
    const now = Date.now();

    if (previous && previous.text === text.trim() && now - previous.timestamp < 15 * 60 * 1000) {
      return {
        isSpam: true,
        reason: "Duplicate comment detected. You recently posted an identical comment.",
      };
    }
  }

  return { isSpam: false };
};

/**
 * Records successful comment for duplicate tracking
 */
export const recordCommentSubmission = (text, userId, videoId) => {
  if (userId && videoId) {
    const cacheKey = `${userId}_${videoId}`;
    duplicateCache.set(cacheKey, { text: text.trim(), timestamp: Date.now() });
  }
};

/**
 * Rate Limiter: Max 4 comments per 30 seconds
 * Returns { isRateLimited: boolean, remainingSeconds: number, requireCaptcha: boolean }
 */
export const checkRateLimit = (identifier) => {
  const now = Date.now();
  const windowMs = 30 * 1000; // 30 seconds
  const maxAttempts = 4;

  const timestamps = commentRateLimits.get(identifier) || [];
  // Keep timestamps within sliding window
  const activeTimestamps = timestamps.filter((t) => now - t < windowMs);

  if (activeTimestamps.length >= maxAttempts) {
    const oldest = activeTimestamps[0];
    const remainingSeconds = Math.ceil((windowMs - (now - oldest)) / 1000);
    return {
      isRateLimited: true,
      remainingSeconds: Math.max(1, remainingSeconds),
      requireCaptcha: true,
    };
  }

  activeTimestamps.push(now);
  commentRateLimits.set(identifier, activeTimestamps);

  return { isRateLimited: false, requireCaptcha: false };
};

/**
 * Generates an arithmetic CAPTCHA challenge
 */
export const generateCaptcha = () => {
  const num1 = Math.floor(Math.random() * 9) + 1;
  const num2 = Math.floor(Math.random() * 9) + 1;
  const operations = ["+", "*", "-"];
  const op = operations[Math.floor(Math.random() * operations.length)];

  let answer;
  let question;

  if (op === "+") {
    answer = num1 + num2;
    question = `What is ${num1} + ${num2}?`;
  } else if (op === "*") {
    answer = num1 * num2;
    question = `What is ${num1} × ${num2}?`;
  } else {
    // Keep positive
    const max = Math.max(num1, num2);
    const min = Math.min(num1, num2);
    answer = max - min;
    question = `What is ${max} - ${min}?`;
  }

  const token = crypto.randomBytes(16).toString("hex");
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 mins

  captchaStore.set(token, { answer: String(answer), expiresAt });

  return {
    token,
    question,
    expiresAt,
  };
};

/**
 * Verifies submitted CAPTCHA answer
 */
export const verifyCaptcha = (token, submittedAnswer) => {
  if (!token || submittedAnswer === undefined || submittedAnswer === null) {
    return false;
  }

  const challenge = captchaStore.get(token);
  if (!challenge) return false;

  if (Date.now() > challenge.expiresAt) {
    captchaStore.delete(token);
    return false;
  }

  const isValid = challenge.answer.trim() === String(submittedAnswer).trim();
  captchaStore.delete(token); // 1-time use
  return isValid;
};

/**
 * Extracts @mentions from text
 */
export const extractMentions = (text) => {
  if (!text) return [];
  const matches = text.match(/@([a-zA-Z0-9_\.-]+)/g);
  if (!matches) return [];
  return Array.from(new Set(matches.map((m) => m.substring(1))));
};
