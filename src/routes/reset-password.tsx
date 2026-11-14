import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Heart } from "@/components/Heart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Choose a new password — Aisha's journal" },
      { name: "description", content: "Set a new password for your Aisha's journal account." },
      { property: "og:title", content: "Choose a new password — Aisha's journal" },
      { property: "og:description", content: "Set a new password for your Aisha's journal account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated 🩷");
    navigate({ to: "/journal" });
  }

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <form onSubmit={submit} className="paper-card space-y-5 p-6 sm:p-8">
        <div className="text-center">
          <Heart className="mx-auto mb-3 h-10 w-10 text-primary" />
          <h1 className="text-3xl font-semibold">New password</h1>
          <p className="mt-1 text-sm text-muted-foreground">Pick something only you would know.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">New password</Label>
          <Input id="password" type="password" minLength={6} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <Button type="submit" variant="hero" size="lg" className="w-full" disabled={busy}>
          {busy && <Loader2 className="animate-spin" />} Save password
        </Button>
      </form>
    </main>
  );
}
