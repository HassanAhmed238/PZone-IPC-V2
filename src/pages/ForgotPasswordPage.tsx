import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logoBlack from "@/assets/logo-black.png";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src={logoBlack} alt="P.ZONE" className="h-10 mx-auto mb-4" />
          <h1 className="text-2xl font-heading font-bold text-foreground">Reset password</h1>
          <p className="text-sm text-muted-foreground mt-1">We'll send you a reset link</p>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <p className="text-sm text-foreground">Check your email for a password reset link.</p>
            <Link to="/login" className="text-sm text-primary font-medium hover:underline">
              Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-card text-foreground text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="you@company.com"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>
            <p className="text-center">
              <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">
                Back to login
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
