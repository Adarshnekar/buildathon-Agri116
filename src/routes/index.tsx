import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import Dashboard from "@/components/Dashboard";
import LoginPage from "@/components/LoginPage";
import { Toaster } from "@/components/ui/sonner";

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
  const [isClient, setIsClient] = useState<boolean>(false);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== "undefined") {
      const auth = localStorage.getItem("quantumgrow_auth");
      if (auth === "true") {
        setIsAuthenticated(true);
      }
    }
  }, []);

  const handleLogin = (userEmail?: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("quantumgrow_auth", "true");
      if (userEmail) {
        localStorage.setItem("quantumgrow_user_email", userEmail);
      }
    }
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("quantumgrow_auth");
      localStorage.removeItem("quantumgrow_user_email");
    }
    setIsAuthenticated(false);
  };

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
