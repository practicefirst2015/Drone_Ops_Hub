import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plane } from "lucide-react";

type Mode = "login" | "signup" | "reset";

/** Minimum bar for a new password. Deliberately simple to explain to users. */
const PASSWORD_MIN = 10;
function passwordProblem(pw: string): string | null {
  if (pw.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
  if (!/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) return "Include at least one letter and one number.";
  if (/^(password|12345678|qwerty|letmein|airframe)/i.test(pw)) return "That password is too easy to guess.";
  return null;
}

const Auth = () => {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const isLogin = mode === "login";
  const isSignup = mode === "signup";
  const isReset = mode === "reset";

  const switchMode = (m: Mode) => { setMode(m); setError(""); setMessage(""); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (isSignup) {
      const problem = passwordProblem(password);
      if (problem) { setError(problem); return; }
    }

    setLoading(true);

    if (isReset) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });
      // Don't reveal whether an account exists for this address.
      if (error && !/rate|limit/i.test(error.message)) {
        setMessage("If an account exists for that address, a reset link is on its way.");
      } else if (error) {
        setError(error.message);
      } else {
        setMessage("If an account exists for that address, a reset link is on its way.");
      }
    } else if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) {
        setError(error.message);
      } else {
        setMessage("Check your email to confirm your account.");
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10 justify-center">
          <div className="w-10 h-10 border border-primary flex items-center justify-center">
            <Plane className="w-5 h-5 text-primary" />
          </div>
          <span className="font-mono text-lg font-semibold tracking-widest uppercase text-foreground">
            AIRFRAME
          </span>
        </div>

        <div className="surface border border-border p-8">
          <h1 className="font-mono text-lg font-light text-foreground mb-1">
            {isLogin ? "Sign In" : isSignup ? "Create Account" : "Reset Password"}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            {isLogin
              ? "Access your operations dashboard"
              : isSignup
                ? "Set up your pilot credentials"
                : "We'll email you a link to set a new password"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <div>
                <label className="stat-label block mb-2">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                  placeholder="Enter your name"
                  required
                />
              </div>
            )}

            <div>
              <label className="stat-label block mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                placeholder="pilot@airframe.io"
                required
              />
            </div>

            {!isReset && (
              <div>
                <label className="stat-label block mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                  placeholder="••••••••"
                  required
                  minLength={isSignup ? PASSWORD_MIN : 6}
                />
                {isSignup && (
                  <p className="font-mono text-[10px] text-muted-foreground mt-1.5">
                    At least {PASSWORD_MIN} characters, with a letter and a number.
                  </p>
                )}
              </div>
            )}

            {error && (
              <p className="font-mono text-xs text-destructive">{error}</p>
            )}
            {message && (
              <p className="font-mono text-xs text-success">{message}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-primary text-primary-foreground font-mono text-sm tracking-wide hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? "Processing..." : isLogin ? "Sign In" : isSignup ? "Create Account" : "Send Reset Link"}
            </button>
          </form>

          <div className="mt-6 space-y-2 text-center">
            <button
              onClick={() => switchMode(isSignup ? "login" : "signup")}
              className="block w-full font-mono text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              {isSignup ? "Already have an account? Sign in" : "Need an account? Sign up"}
            </button>
            <button
              onClick={() => switchMode(isReset ? "login" : "reset")}
              className="block w-full font-mono text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              {isReset ? "Back to sign in" : "Forgot your password?"}
            </button>
          </div>

          {isSignup && (
            <p className="mt-6 text-center text-[10px] text-muted-foreground leading-relaxed">
              By creating an account you agree to our{" "}
              <a href="/terms" className="underline hover:text-foreground">Terms</a> and{" "}
              <a href="/privacy" className="underline hover:text-foreground">Privacy Policy</a>.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
