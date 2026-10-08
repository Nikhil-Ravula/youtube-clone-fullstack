import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { useState, useEffect, createContext, useContext } from "react";
import { provider, auth } from "./firebase";
import axiosInstance from "./axiosinstance";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  // Start with null on both server and client to guarantee 100% hydration match
  const [user, setUser] = useState(null);
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Restore user session from localStorage after initial client mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Error reading stored user session:", e);
    }
  }, []);

  const openSignInModal = (err = null) => {
    if (err) setAuthError(err);
    setIsSignInModalOpen(true);
  };

  const closeSignInModal = () => {
    setIsSignInModalOpen(false);
    setAuthError(null);
  };

  const login = (userdata) => {
    setUser(userdata);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("user", JSON.stringify(userdata));
      } catch (e) {
        console.error("Error saving user to localStorage:", e);
      }
    }
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

  const quickSignIn = async ({ email, name, image }) => {
    const payload = {
      email: email || "demo@yourtube.com",
      name: name || "Demo User",
      image:
        image ||
        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face",
    };
    const response = await axiosInstance.post("/user/login", payload);
    const loggedInUser = response.data.result;
    login(loggedInUser);
    closeSignInModal();
    return loggedInUser;
  };

  const executeGoogleSignIn = async () => {
    try {
      setAuthError(null);
      const result = await signInWithPopup(auth, provider);
      const firebaseuser = result.user;
      const payload = {
        email: firebaseuser.email,
        name: firebaseuser.displayName || "Google User",
        image: firebaseuser.photoURL || "https://github.com/shadcn.png",
      };
      const response = await axiosInstance.post("/user/login", payload);
      login(response.data.result);
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

  // Calling handlegooglesignin opens the SignInModal so users get both Google & 1-click login
  const handlegooglesignin = () => {
    openSignInModal();
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseuser) => {
      if (firebaseuser) {
        try {
          const payload = {
            email: firebaseuser.email,
            name: firebaseuser.displayName,
            image: firebaseuser.photoURL || "https://github.com/shadcn.png",
          };
          const response = await axiosInstance.post("/user/login", payload);
          login(response.data.result);
        } catch (error) {
          console.error("Error auto-syncing Firebase user:", error);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <UserContext.Provider
      value={{
        user,
        login,
        logout,
        handlegooglesignin,
        executeGoogleSignIn,
        quickSignIn,
        isSignInModalOpen,
        openSignInModal,
        closeSignInModal,
        authError,
        setAuthError,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
