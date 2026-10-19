import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { provider, auth } from "./firebase";
import axiosInstance from "./axiosinstance";
import { getDeviceTelemetry } from "./deviceFingerprint";
import { getClientISTTimeInfo, applyThemeToDocument } from "./themeHelper";
import { SecurityOtpModal, SecurityChallengeData } from "@/components/SecurityOtpModal";
import { toast } from "sonner";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Security OTP Challenge Modal state
  const [securityChallenge, setSecurityChallenge] = useState(null);
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);

  // Theme Management (Light: 5 AM - 12 PM IST, Dark: all other times)
  const [theme, setThemeState] = useState("dark");
  const [themePreference, setThemePreferenceState] = useState("auto");

  /**
   * Apply theme to state, localStorage, and document HTML class
   */
  const applyTheme = useCallback((newTheme, newPreference = "auto") => {
    const validTheme = newTheme === "light" ? "light" : "dark";
    setThemeState(validTheme);
    setThemePreferenceState(newPreference);
    applyThemeToDocument(validTheme);

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("yourtube_theme", validTheme);
        localStorage.setItem("yourtube_theme_preference", newPreference);
      } catch (e) {}
    }
  }, []);

  /**
   * Update theme both locally and persist to backend user profile
   */
  const updateTheme = async (newTheme, newPreference = null) => {
    const pref = newPreference || (newTheme === "auto" ? "auto" : newTheme);
    let resolvedTheme = newTheme;

    if (pref === "auto") {
      const ist = getClientISTTimeInfo();
      resolvedTheme = ist.theme;
    }

    applyTheme(resolvedTheme, pref);

    // If user logged in, persist to backend
    if (user?._id) {
      try {
        await axiosInstance.put("/user/theme", {
          userId: user._id,
          theme: resolvedTheme,
          themePreference: pref,
        });
        // Update user state
        setUser((prev) => (prev ? { ...prev, theme: resolvedTheme, themePreference: pref } : prev));
      } catch (err) {
        console.error("Failed to persist theme to backend:", err);
      }
    }
  };

  // Initial client mount: restore session and theme
  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      let storedUser = null;
      if (stored) {
        storedUser = JSON.parse(stored);
        setUser(storedUser);
      }

      // Restore or initialize theme
      const storedPref = localStorage.getItem("yourtube_theme_preference") || storedUser?.themePreference || "auto";
      const storedTheme = localStorage.getItem("yourtube_theme") || storedUser?.theme;

      if (storedPref === "auto") {
        const ist = getClientISTTimeInfo();
        applyTheme(ist.theme, "auto");
      } else if (storedTheme === "light" || storedTheme === "dark") {
        applyTheme(storedTheme, storedPref);
      } else {
        const ist = getClientISTTimeInfo();
        applyTheme(ist.theme, "auto");
      }
    } catch (e) {
      console.error("Error reading stored user session / theme:", e);
    }
  }, [applyTheme]);

  const openSignInModal = (err = null) => {
    if (err) setAuthError(err);
    setIsSignInModalOpen(true);
  };

  const closeSignInModal = () => {
    setIsSignInModalOpen(false);
    setAuthError(null);
  };

  const login = (userdata, serverTheme = null, serverPref = null) => {
    setUser(userdata);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("user", JSON.stringify(userdata));
      } catch (e) {
        console.error("Error saving user to localStorage:", e);
      }
    }

    // Apply theme from server response or user preference
    const userPref = serverPref || userdata?.themePreference || "auto";
    let activeTheme = serverTheme || userdata?.theme;

    if (userPref === "auto" || !activeTheme) {
      const ist = getClientISTTimeInfo();
      activeTheme = ist.theme;
    }

    applyTheme(activeTheme, userPref);
  };

  const logout = async () => {
    setUser(null);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("user");
      } catch (e) {
        console.error("Error clearing user from localStorage:", e);
      }
    }
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error during sign out:", error);
    }
  };

  /**
   * Quick Sign-In with device telemetry and anomaly interception
   */
  const quickSignIn = async ({ email, name, image }) => {
    const telemetry = getDeviceTelemetry();
    const payload = {
      email: email || "demo@yourtube.com",
      name: name || "Demo User",
      image:
        image ||
        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face",
      ...telemetry,
    };

    const response = await axiosInstance.post("/user/login", payload);

    // If backend detects an anomaly on a new browser/device/IP/location
    if (response.data?.requireOtp) {
      setSecurityChallenge(response.data);
      setIsOtpModalOpen(true);
      closeSignInModal();
      return { requireOtp: true };
    }

    const loggedInUser = response.data.result;
    login(loggedInUser, response.data.theme, response.data.themePreference);
    closeSignInModal();
    return loggedInUser;
  };

  /**
   * Google Sign-In with device telemetry and anomaly interception
   */
  const executeGoogleSignIn = async () => {
    try {
      setAuthError(null);
      const result = await signInWithPopup(auth, provider);
      const firebaseuser = result.user;
      const telemetry = getDeviceTelemetry();

      const payload = {
        email: firebaseuser.email,
        name: firebaseuser.displayName || "Google User",
        image: firebaseuser.photoURL || "https://github.com/shadcn.png",
        ...telemetry,
      };

      const response = await axiosInstance.post("/user/login", payload);

      if (response.data?.requireOtp) {
        setSecurityChallenge(response.data);
        setIsOtpModalOpen(true);
        closeSignInModal();
        return { requireOtp: true };
      }

      login(response.data.result, response.data.theme, response.data.themePreference);
      closeSignInModal();
      return response.data.result;
    } catch (error) {
      console.error("Google sign in error:", error);
      if (error?.code === "auth/unauthorized-domain") {
        setAuthError({
          code: error.code,
          message: "Domain not authorized in Firebase.",
        });
      } else if (error?.code === "auth/popup-blocked") {
        setAuthError({
          code: error.code,
          message:
            "Popup blocked by browser. Please allow popups or use Quick Sign-In.",
        });
      } else {
        setAuthError({
          code: error?.code || "auth/unknown",
          message:
            error?.message ||
            "Google sign-in could not be completed. Please use Quick Sign-In.",
        });
      }
      setIsSignInModalOpen(true);
      return null;
    }
  };

  const handlegooglesignin = () => {
    openSignInModal();
  };

  // Sync Firebase authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseuser) => {
      if (firebaseuser && !user) {
        try {
          const telemetry = getDeviceTelemetry();
          const payload = {
            email: firebaseuser.email,
            name: firebaseuser.displayName,
            image: firebaseuser.photoURL || "https://github.com/shadcn.png",
            ...telemetry,
          };
          const response = await axiosInstance.post("/user/login", payload);
          if (response.data?.requireOtp) {
            setSecurityChallenge(response.data);
            setIsOtpModalOpen(true);
          } else {
            login(response.data.result, response.data.theme, response.data.themePreference);
          }
        } catch (error) {
          console.error("Error auto-syncing Firebase user:", error);
        }
      }
    });
    return () => unsubscribe();
  }, [user]);

  const refreshUser = async () => {
    if (!user?._id) return null;
    try {
      const res = await axiosInstance.get(`/user/${user._id}`);
      if (res.data) {
        login(res.data, res.data.theme, res.data.themePreference);
        return res.data;
      }
    } catch (e) {
      console.error("Error refreshing user:", e);
    }
    return user;
  };

  const handleSecurityOtpVerified = (verifiedUser) => {
    setIsOtpModalOpen(false);
    setSecurityChallenge(null);
    login(verifiedUser, verifiedUser.theme, verifiedUser.themePreference);
  };

  return (
    <UserContext.Provider
      value={{
        user,
        login,
        logout,
        refreshUser,
        handlegooglesignin,
        executeGoogleSignIn,
        quickSignIn,
        isSignInModalOpen,
        openSignInModal,
        closeSignInModal,
        authError,
        setAuthError,
        theme,
        themePreference,
        updateTheme,
      }}
    >
      {children}
      <SecurityOtpModal
        isOpen={isOtpModalOpen}
        onClose={() => setIsOtpModalOpen(false)}
        challengeData={securityChallenge}
        onVerified={handleSecurityOtpVerified}
      />
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
