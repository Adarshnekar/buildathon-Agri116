import React, { useState } from "react";
import {
  Eye,
  EyeOff,
  Sprout,
  Headphones,
  Cpu,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Check,
  KeyRound,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { auth, googleProvider } from "@/lib/firebase";
import { FirebaseError } from "firebase/app";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
} from "firebase/auth";

interface LoginPageProps {
  onLoginSuccess: (email?: string) => void;
}

const FEATURE_SLIDES = [
  {
    tag: "Autonomous IoT Engine",
    cardTitle: "Reach environmental goals faster",
    cardDesc:
      "Automated dual-core stage algorithms balance photon delivery, mist cycles, and thermal airflow with zero manual hassle.",
    cardBadgeLabel: "DLI Target Delivery",
    cardBadgeValue: "100% On Track",
    nodeModel: "ESP32-WROOM-32D",
    nodeStatus: "DUAL-CORE ACTIVE",
    sectionTitle: "Introducing new features",
    sectionDesc:
      "Analyzing real-time sensor trends ensures that polyhouses always make the right decision. And as the scale of the facility and crop yield magnifies, automated climate intelligence scales with you.",
  },
  {
    tag: "Precision Root Zone",
    cardTitle: "Adaptive Soil Moisture Matrix",
    cardDesc:
      "Multi-depth capacitive sensors monitor volumetric water content and trigger micro-irrigation pulses automatically.",
    cardBadgeLabel: "Soil Matrix Avg",
    cardBadgeValue: "42.5% VWC",
    nodeModel: "ZONE-A VALVES",
    nodeStatus: "SOLENOID SYNCED",
    sectionTitle: "Dual-depth capacitive monitoring",
    sectionDesc:
      "Prevent root hypoxia and nutrient leaching by syncing pulse irrigation directly with crop transpiration and substrate drying curves.",
  },
  {
    tag: "Energy Harvesting",
    cardTitle: "Solar-blended Quantum Lighting",
    cardDesc:
      "Dynamically offsets artificial grow LEDs whenever natural sunlight photon flux satisfies canopy photosynthetic demands.",
    cardBadgeLabel: "Natural Solar Offset",
    cardBadgeValue: "72% Grid Saved",
    nodeModel: "QUANTUM-PWM",
    nodeStatus: "DLI ACCUMULATING",
    sectionTitle: "Intelligent energy optimization",
    sectionDesc:
      "Capture maximum natural solar photons while capping supplemental power draw during peak utility tariff windows.",
  },
];

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [mode, setMode] = useState<"signin" | "create">("signin");

  const slide = FEATURE_SLIDES[activeSlide];

  const fillPolyhouseCredentials = () => {
    setEmail("polyhouse299@gmail.com");
    setPassword("Polyhouse@123");
    toast.info("Node #01 Credentials Loaded", {
      description: "polyhouse299@gmail.com filled. Click 'Sign in' to connect.",
    });
  };

  const getFriendlyAuthError = (err: unknown): string => {
    if (err instanceof FirebaseError) {
      switch (err.code) {
        case "auth/invalid-credential":
        case "auth/user-not-found":
        case "auth/wrong-password":
          return "Invalid email or password. Please verify credentials or create an account.";
        case "auth/email-already-in-use":
          return "This email is already registered. Please sign in instead.";
        case "auth/weak-password":
          return "Password should be at least 6 characters long.";
        case "auth/invalid-email":
          return "Please enter a valid email address.";
        case "auth/too-many-requests":
          return "Too many failed login attempts. Please reset password or try again later.";
        case "auth/network-request-failed":
          return "Network error. Check your internet connection.";
        case "auth/popup-closed-by-user":
          return "Sign-in popup was closed before completion.";
        case "auth/operation-not-allowed":
          return "Authentication provider not enabled in Firebase Console.";
        default:
          return err.message.replace("Firebase: ", "");
      }
    }
    return "Authentication failed. Please try again.";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      toast.error("Email required", { description: "Please enter your email address." });
      return;
    }
    if (!password) {
      toast.error("Password required", { description: "Please enter your password." });
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === "signin") {
        const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
        const signedInEmail = userCredential.user.email || cleanEmail;
        toast.success("Signed in successfully", {
          description: `Logged in as ${signedInEmail}. Connected to Smart Polyhouse Node #01.`,
        });
        onLoginSuccess(signedInEmail);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        const createdEmail = userCredential.user.email || cleanEmail;
        toast.success("Account created successfully", {
          description: `Welcome ${createdEmail}! Connected to Smart Polyhouse Node #01.`,
        });
        onLoginSuccess(createdEmail);
      }
    } catch (err: unknown) {
      console.error("Auth error:", err);
      toast.error(mode === "signin" ? "Sign In Failed" : "Account Creation Failed", {
        description: getFriendlyAuthError(err),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const googleEmail = result.user.email || "google.operator@quantumgrow.io";
      toast.success("Signed in with Google", {
        description: `Welcome ${googleEmail}. Connected to Smart Polyhouse Node #01.`,
      });
      onLoginSuccess(googleEmail);
    } catch (err: unknown) {
      console.error("Google Auth error:", err);
      if (err instanceof FirebaseError && err.code === "auth/popup-closed-by-user") {
        setIsSubmitting(false);
        return;
      }
      toast.error("Google Sign-In Failed", {
        description: getFriendlyAuthError(err),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = async (provider: "google" | "facebook" | "demo") => {
    if (provider === "google") {
      await handleGoogleLogin();
      return;
    }

    if (provider === "facebook") {
      toast.info("Facebook Login", {
        description: "Facebook OAuth requires configuration in the Firebase Console. Use Email or Google to sign in.",
      });
      return;
    }

    // Demo / Quick Operator Login
    setIsSubmitting(true);
    try {
      // Attempt logging in with the provisioned hardware operator account
      const userCredential = await signInWithEmailAndPassword(
        auth,
        "polyhouse299@gmail.com",
        "Polyhouse@123"
      );
      const email = userCredential.user.email || "polyhouse299@gmail.com";
      toast.success("Node #01 Operator Session Active", {
        description: `Connected with verified hardware node account: ${email}`,
      });
      onLoginSuccess(email);
    } catch {
      // Fallback for offline demo mode
      const fallbackEmail = "operator@quantumgrow.io";
      toast.success("Signed in with Demo Operator", {
        description: `Welcome to QuantumGrow Smart Polyhouse. Active Node: #01 (Offline fallback).`,
      });
      onLoginSuccess(fallbackEmail);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      toast.error("Email required", {
        description: "Please enter your email in the field above to receive password reset instructions.",
      });
      return;
    }

    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      toast.success("Password Reset Email Sent", {
        description: `Instructions have been sent to ${cleanEmail}. Check your inbox or spam folder.`,
      });
    } catch (err: unknown) {
      console.error("Password reset error:", err);
      toast.error("Password Reset Failed", {
        description: getFriendlyAuthError(err),
      });
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#ECEAE2] flex items-center justify-center p-2.5 sm:p-6 md:p-10 font-sans text-neutral-900 antialiased selection:bg-[#123C2A] selection:text-white">
      {/* Main Split-Screen Card */}
      <div className="w-full max-w-[1040px] bg-white rounded-2xl sm:rounded-[36px] shadow-[0_20px_60px_-15px_rgba(18,60,42,0.18)] border border-[#DED9CB]/70 overflow-hidden grid grid-cols-1 lg:grid-cols-2 min-h-0 lg:min-h-[660px]">
        
        {/* ────────────────────────────────────────────────────────────
            LEFT COLUMN: SIGN IN FORM (Clean White)
        ──────────────────────────────────────────────────────────── */}
        <div className="p-5 sm:p-8 md:p-12 lg:p-14 flex flex-col justify-between bg-white relative">
          <div>
            {/* Brand Logo & Name */}
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#123C2A] text-white shadow-sm">
                <Sprout className="h-5 w-5" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold tracking-tight text-[#123C2A]">
                  quantumgrow
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-[#2F6B4F]" />
              </div>
            </div>

            {/* Header */}
            <div className="mt-6 sm:mt-10">
              <h1 className="text-2xl sm:text-[34px] font-bold tracking-tight text-neutral-900 leading-tight">
                {mode === "signin" ? "Sign in" : "Create account"}
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 mt-1.5 sm:mt-2">
                {mode === "signin" ? (
                  <>
                    Don&apos;t have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setMode("create")}
                      className="font-semibold text-neutral-900 hover:text-[#123C2A] underline underline-offset-2 transition-colors cursor-pointer"
                    >
                      Create now
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setMode("signin")}
                      className="font-semibold text-neutral-900 hover:text-[#123C2A] underline underline-offset-2 transition-colors cursor-pointer"
                    >
                      Sign in instead
                    </button>
                  </>
                )}
              </p>
            </div>

            {/* Quick Fill Node Credentials Hint */}
            <button
              type="button"
              onClick={fillPolyhouseCredentials}
              className="mt-3 inline-flex items-center gap-1.5 text-[11px] sm:text-xs text-[#2F6B4F] hover:text-[#123C2A] bg-[#2F6B4F]/10 hover:bg-[#2F6B4F]/15 px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer"
            >
              <KeyRound className="h-3.5 w-3.5 shrink-0" />
              <span>Autofill Node #01 Credentials</span>
            </button>

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-4 sm:mt-5 space-y-3.5 sm:space-y-4">
              {/* Email */}
              <div>
                <label
                  htmlFor="email-input"
                  className="block text-xs font-semibold text-neutral-600 mb-1"
                >
                  E-mail
                </label>
                <input
                  id="email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="polyhouse299@gmail.com"
                  autoComplete="email"
                  className="w-full h-11 px-3.5 rounded-xl border border-neutral-200 bg-white text-base sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#123C2A]/20 focus:border-[#123C2A] transition-all"
                />
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password-input"
                  className="block text-xs font-semibold text-neutral-600 mb-1"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password-input"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    className="w-full h-11 px-3.5 pr-11 rounded-xl border border-neutral-200 bg-white text-base sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#123C2A]/20 focus:border-[#123C2A] transition-all"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 transition-colors p-1"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember me & Forgot Password */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <Checkbox
                    id="remember-me"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(!!checked)}
                    className="border-neutral-300 data-[state=checked]:bg-[#123C2A] data-[state=checked]:border-[#123C2A] rounded-md h-4 w-4"
                  />
                  <span className="text-xs text-neutral-600 font-medium">
                    Remember me
                  </span>
                </label>

                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs font-medium text-neutral-600 hover:text-neutral-900 underline underline-offset-2 transition-colors cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 mt-4 rounded-xl font-semibold text-sm bg-[#123C2A] text-white hover:bg-[#1B4D36] active:bg-[#0B2B1E] transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Connecting to Firebase...
                  </span>
                ) : (
                  <span>{mode === "signin" ? "Sign in with Firebase" : "Create Account"}</span>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative flex items-center justify-center my-6">
              <div className="w-full border-t border-neutral-200" />
              <span className="absolute bg-white px-3 text-xs text-neutral-400">
                or
              </span>
            </div>

            {/* Social Logins */}
            <div className="space-y-2.5">
              {/* Google Button */}
              <button
                type="button"
                onClick={() => handleQuickLogin("google")}
                disabled={isSubmitting}
                className="w-full h-10 px-4 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 hover:border-neutral-300 text-neutral-700 font-medium text-xs sm:text-sm transition-all flex items-center justify-center gap-3 cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.04)] disabled:opacity-60"
              >
                {/* Official Google 'G' icon */}
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              {/* Facebook Button */}
              <button
                type="button"
                onClick={() => handleQuickLogin("facebook")}
                disabled={isSubmitting}
                className="w-full h-10 px-4 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 hover:border-neutral-300 text-neutral-700 font-medium text-xs sm:text-sm transition-all flex items-center justify-center gap-3 cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.04)] disabled:opacity-60"
              >
                {/* Official Facebook 'f' icon */}
                <svg className="h-4 w-4 shrink-0" fill="#1877F2" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                <span>Continue with Facebook</span>
              </button>
            </div>
          </div>

          {/* Quick Demo Access Bar at bottom */}
          <div className="pt-6 mt-4 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
            <span className="flex items-center gap-1.5 text-neutral-400">
              <ShieldCheck className="h-3.5 w-3.5 text-[#2F6B4F]" />
              Firebase Auth Node #01
            </span>
            <button
              type="button"
              onClick={() => handleQuickLogin("demo")}
              disabled={isSubmitting}
              className="font-semibold text-[#123C2A] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-60"
            >
              One-Click Node #01 Operator Login
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* ────────────────────────────────────────────────────────────
            RIGHT COLUMN: DARK GREEN FEATURE HERO (Desktop only)
        ──────────────────────────────────────────────────────────── */}
        <div className="hidden lg:flex p-8 sm:p-12 lg:p-14 bg-[#123C2A] text-white flex-col justify-between relative overflow-hidden">
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-[radial-gradient(circle,rgba(47,107,79,0.45)_0%,transparent_70%)] pointer-events-none -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-[radial-gradient(circle,rgba(27,77,54,0.35)_0%,transparent_70%)] pointer-events-none -ml-20 -mb-20" />

          {/* Top Bar: Support Link */}
          <div className="relative z-10 flex items-center justify-end">
            <button
              type="button"
              onClick={() =>
                toast.info("QuantumGrow Support Desk", {
                  description:
                    "Technical manual, ESP32 dual-core loop specs, and RTDB telemetry schemas are available 24/7.",
                })
              }
              className="text-xs font-medium text-white/80 hover:text-white flex items-center gap-2 transition-colors cursor-pointer group"
            >
              <Headphones className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
              <span>Support</span>
            </button>
          </div>

          {/* Middle: Floating Showcase Card (Matching Mockup Composition) */}
          <div className="relative z-10 my-auto py-6">
            <div className="bg-white text-neutral-900 rounded-2xl p-6 sm:p-7 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35)] relative max-w-[340px] sm:max-w-[360px] mx-auto border border-white/20">
              {/* Badge */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#123C2A]/10 text-[#123C2A] text-[10px] font-bold uppercase tracking-wider mb-2">
                <Sparkles className="h-3 w-3 text-[#2F6B4F]" />
                {slide.tag}
              </div>

              {/* Title & Description */}
              <h3 className="text-xl sm:text-[22px] font-bold text-neutral-900 leading-snug tracking-tight">
                {slide.cardTitle}
              </h3>
              <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
                {slide.cardDesc}
              </p>

              {/* Action Button */}
              <div className="mt-5">
                <button
                  type="button"
                  onClick={() =>
                    setActiveSlide((prev) => (prev + 1) % FEATURE_SLIDES.length)
                  }
                  className="px-4 py-2 rounded-full bg-[#123C2A] text-white text-xs font-semibold hover:bg-[#1B4D36] transition-colors shadow-sm cursor-pointer inline-flex items-center gap-1.5"
                >
                  <span>Learn more</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              {/* Floating Dark IoT Controller Mock Card */}
              <div className="hidden sm:block absolute -right-6 -bottom-8 w-44 rounded-xl bg-gradient-to-br from-[#1B4D36] to-[#0D281C] p-3 text-white shadow-2xl border border-white/20 transform rotate-2 hover:rotate-0 transition-transform duration-300">
                <div className="flex items-center justify-between text-[9px] text-white/70">
                  <span className="flex items-center gap-1 font-mono font-semibold">
                    <Cpu className="h-3 w-3 text-[#A8C5A2]" />
                    {slide.nodeModel}
                  </span>
                  <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>

                <div className="mt-2 text-[10px] font-semibold text-white/90">
                  {slide.nodeStatus}
                </div>

                {/* Micro Metric Badge */}
                <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between">
                  <div>
                    <p className="text-[8px] text-white/60 font-medium">
                      {slide.cardBadgeLabel}
                    </p>
                    <p className="text-xs font-bold text-white">
                      {slide.cardBadgeValue}
                    </p>
                  </div>
                  <div className="h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Check className="h-3 w-3" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Section: Feature Intro & Carousel Pagination */}
          <div className="relative z-10 pt-4">
            <h4 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              {slide.sectionTitle}
            </h4>
            <p className="text-xs sm:text-sm text-white/75 mt-2 leading-relaxed max-w-md">
              {slide.sectionDesc}
            </p>

            {/* Pagination Dots */}
            <div className="flex items-center justify-center gap-2 mt-6">
              {FEATURE_SLIDES.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  aria-label={`Slide ${idx + 1}`}
                  onClick={() => setActiveSlide(idx)}
                  className={`transition-all duration-300 rounded-full cursor-pointer ${
                    activeSlide === idx
                      ? "h-1.5 w-5 bg-white shadow-sm"
                      : "h-1.5 w-1.5 bg-white/40 hover:bg-white/70"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
