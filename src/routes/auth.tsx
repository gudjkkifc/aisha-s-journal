import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";

import { Heart } from "@/components/Heart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

type Mode = "signin" | "signup" | "forgot";
type AuthSearch = { mode?: Mode | undefined; redirect?: string | undefined };

function safeRedirect(value: string | undefined) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/journal";
}

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): AuthSearch => {
    const mode = search["mode"];
    const redirect = search["redirect"];
    return {
      mode: mode === "signup" || mode === "forgot" ? mode : undefined,
      redirect: typeof redirect === "string" ? redirect : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Sign in — Aisha's journal" },
      { name: "description", content: "Sign in or create your account for Aisha's journal." },
      { property: "og:title", content: "Sign in — Aisha's journal" },
      { property: "og:description", content: "Sign in or create your account for Aisha's journal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>(search.mode ?? "signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<null | "confirm" | "reset">(null);
  const target = safeRedirect(search.redirect);

  useEffect(() => {
    if (user) navigate({ to: target, replace: true });
  }, [user, target, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + "/journal",
            data: { display_name: name.trim() },
          },
        });
        if (error) throw error;
        if (!data.session) setSent("confirm");
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setSent("reset");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <main className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center">
        <div className="mb-5 grid h-16 w-16 place-items-center rounded-full bg-rose-gradient text-primary-foreground shadow-glow">
          <MailCheck className="h-7 w-7" />
        </div>
        <h1 className="text-3xl font-semibold">Check your email</h1>
        <p className="mt-3 text-muted-foreground">
          {sent === "confirm"
            ? `We sent a confirmation link to ${email}. Open it to start your journal.`
            : `We sent a link to ${email} so you can choose a new password.`}
        </p>
        <Button variant="link" className="mt-6" onClick={() => { setSent(null); setMode("signin"); }}>
          Back to sign in
        </Button>
      </main>
    );
  }

  const titles: Record<Mode, string> = {
    signin: "Welcome back",
    signup: "Start your journal",
    forgot: "Forgot your password?",
  };

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <div className="paper-card p-6 sm:p-8">
        <div className="mb-6 text-center">
          <Heart className="mx-auto mb-3 h-10 w-10 text-primary" />
          <h1 className="text-3xl font-semibold">{titles[mode]}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "forgot"
              ? "Enter your email and we'll send you a reset link."
              : "Your thoughts, your photos, your little pink space."}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Your name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required placeholder="Aisha" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          {mode !== "forgot" && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {mode === "signin" && (
                  <button type="button" onClick={() => setMode("forgot")} className="text-xs font-medium text-primary hover:underline">
                    Forgot password?
                  </button>
                )}
              </div>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          )}
          <Button type="submit" variant="hero" size="lg" className="w-full" disabled={busy}>
            {busy && <Loader2 className="animate-spin" />}
            {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "signup" ? (
            <>Already have an account?{" "}
              <button onClick={() => setMode("signin")} className="font-semibold text-primary hover:underline">Sign in</button>
            </>
          ) : mode === "signin" ? (
            <>New here?{" "}
              <button onClick={() => setMode("signup")} className="font-semibold text-primary hover:underline">Create an account</button>
            </>
          ) : (
            <button onClick={() => setMode("signin")} className="font-semibold text-primary hover:underline">Back to sign in</button>
          )}
        </p>
      </div>
    </main>
  );
}
