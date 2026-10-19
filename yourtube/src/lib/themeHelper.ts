/**
 * Time-based theme adaptation utility (IST timezone UTC+05:30)
 * 5:00 AM to 12:00 PM IST -> Light theme
 * All other times -> Dark theme
 */

export interface ISTTimeInfo {
  hours: number;
  minutes: number;
  isLightPeriod: boolean;
  theme: "light" | "dark";
  timeFormatted: string;
  dateFormatted: string;
}

export const getClientISTTimeInfo = (): ISTTimeInfo => {
  const now = new Date();
  const istString = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  const istDate = new Date(istString);
  const hours = istDate.getHours();
  const minutes = istDate.getMinutes();

  // 5:00 AM to 12:00 PM IST is Light theme
  const isLightPeriod = hours >= 5 && hours < 12;
  const theme = isLightPeriod ? "light" : "dark";

  const timeFormatted = istDate.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const dateFormatted = istDate.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return {
    hours,
    minutes,
    isLightPeriod,
    theme,
    timeFormatted,
    dateFormatted,
  };
};

/**
 * Applies the given theme ('light' or 'dark') to documentElement
 */
export const applyThemeToDocument = (theme: "light" | "dark") => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
    root.style.colorScheme = "dark";
  } else {
    root.classList.remove("dark");
    root.style.colorScheme = "light";
  }
};
