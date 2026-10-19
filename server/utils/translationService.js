/**
 * Multilingual Translation Service
 * Uses Google Translate gtx single translation API for high quality,
 * low-latency, zero-dependency translation across 100+ global and Indian languages.
 */

export const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "hi", name: "Hindi (हिन्दी)" },
  { code: "es", name: "Spanish (Español)" },
  { code: "fr", name: "French (Français)" },
  { code: "de", name: "German (Deutsch)" },
  { code: "ja", name: "Japanese (日本語)" },
  { code: "ar", name: "Arabic (العربية)" },
  { code: "te", name: "Telugu (తెలుగు)" },
  { code: "ta", name: "Tamil (தமிழ்)" },
  { code: "bn", name: "Bengali (বাংলা)" },
  { code: "mr", name: "Marathi (मराठी)" },
  { code: "ru", name: "Russian (Русский)" },
  { code: "zh-CN", name: "Chinese (Simplified)" },
  { code: "pt", name: "Portuguese (Português)" },
  { code: "it", name: "Italian (Italiano)" },
  { code: "ko", name: "Korean (한국어)" },
];

/**
 * Translates text into target language
 */
export const translateText = async ({ text, targetLang = "en", sourceLang = "auto" }) => {
  if (!text || !text.trim()) {
    return {
      success: false,
      translatedText: "",
      detectedLanguage: "en",
      error: "No text provided",
    };
  }

  try {
    const encodedText = encodeURIComponent(text.trim());
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodedText}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Translation upstream returned status ${response.status}`);
    }

    const data = await response.json();

    // Data structure: data[0] is array of segment tuples [[translated, original], ...]
    if (Array.isArray(data) && Array.isArray(data[0])) {
      const translatedSegments = data[0].map((seg) => seg[0]).filter(Boolean);
      const translatedText = translatedSegments.join("");
      const detectedLang = data[2] || sourceLang;

      return {
        success: true,
        originalText: text,
        translatedText,
        detectedLanguage: detectedLang,
        targetLanguage: targetLang,
      };
    }

    throw new Error("Invalid response format from translation service");
  } catch (error) {
    console.error("Translation error:", error.message);
    // Graceful fallback for translation failures
    return {
      success: false,
      originalText: text,
      translatedText: text,
      detectedLanguage: sourceLang,
      targetLanguage: targetLang,
      message: "Translation service temporarily unreachable. Displaying original comment.",
    };
  }
};
