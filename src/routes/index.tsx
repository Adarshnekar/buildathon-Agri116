import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import Dashboard from "@/components/Dashboard";
import LoginPage from "@/components/LoginPage";
import { Toaster } from "@/components/ui/sonner";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "QuantumGrow · Smart Polyhouse & Climate Automation" },
      {
        name: "description",
        content:
          "Industrial smart polyhouse dashboard with automated LED, mist, DLI, and climate control.",
      },
    ],
  }),
});

function Index() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);

  useEffect(() => {
    // Check local fallback first
    if (typeof window !== "undefined") {
      const localAuth = localStorage.getItem("quantumgrow_auth");
      const localEmail = localStorage.getItem("quantumgrow_user_email");
      if (localAuth === "true") {
        setIsAuthenticated(true);
        if (localEmail) setUserEmail(localEmail);
      }
    }

    // Subscribe to Firebase Auth state
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
        setUserEmail(user.email || null);
        if (typeof window !== "undefined") {
          localStorage.setItem("quantumgrow_auth", "true");
          if (user.email) {
            localStorage.setItem("quantumgrow_user_email", user.email);
          }
        }
      } else {
        // If not authenticated via Firebase, check if demo session exists
        if (typeof window !== "undefined") {
          const localAuth = localStorage.getItem("quantumgrow_auth");
          if (localAuth !== "true") {
            setIsAuthenticated(false);
            setUserEmail(null);
          }
        }
      }
      setIsLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = (email?: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("quantumgrow_auth", "true");
      if (email) {
        localStorage.setItem("quantumgrow_user_email", email);
        setUserEmail(email);
      }
    }
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Firebase signOut error:", err);
    }
    if (typeof window !== "undefined") {
      localStorage.removeItem("quantumgrow_auth");
      localStorage.removeItem("quantumgrow_user_email");
    }
    setIsAuthenticated(false);
    setUserEmail(null);
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen w-full bg-[#123C2A] flex flex-col items-center justify-center text-white">
        <div className="h-10 w-10 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium tracking-wide text-white/80">Connecting to QuantumGrow Node #01...</p>
      </div>
    );
  }

  return (
    <>
      {isAuthenticated ? (
        <Dashboard onLogout={handleLogout} />
      ) : (
        <LoginPage onLoginSuccess={handleLogin} />
      )}
      <Toaster position="top-right" theme="dark" />
    </>
  );
}
