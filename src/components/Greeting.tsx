import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PenLine, Volume2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { profileQuery } from "@/lib/journal";
import { greetingFor } from "@/lib/theme";

const SESSION_KEY = "journal-greeted";

/** Every time someone opens the site, a voice asks how their day has been. */
export function Greeting() {
  const { user } = useAuth();
  const { data: profile } = useQuery({ ...profileQuery(user?.id ?? ""), enabled: !!user });
  const [show, setShow] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);

  const gender = profile?.gender as "female" | "male" | null | undefined;
  const greeting = greetingFor(gender);

  useEffect(() => {
    if (!user || !gender) return;
    try {
      if (sessionStorage.getItem(SESSION_KEY) === user.id) return;
      sessionStorage.setItem(SESSION_KEY, user.id);
    } catch {
      /* storage blocked: still greet */
    }
    setShow(true);
    const a = new Audio(greeting.audio);
    audio.current = a;
    a.play().catch(() => setNeedsTap(true));
    return () => a.pause();
  }, [user, gender, greeting.audio]);

  if (!show) return null;

  function play() {
    const a = audio.current ?? new Audio(greeting.audio);
    audio.current = a;
    a.currentTime = 0;
    a.play().then(() => setNeedsTap(false)).catch(() => {});
  }

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 animate-in fade-in slide-in-from-bottom-4">
      <div className="paper-card flex w-full max-w-md items-start gap-3 p-4 shadow-glow">
        <button
          type="button"
          onClick={play}
          aria-label="Play greeting"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-rose-gradient text-primary-foreground shadow-glow"
        >
          <Volume2 className={needsTap ? "h-5 w-5 animate-pulse" : "h-5 w-5"} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="font-script text-2xl leading-tight text-primary">{greeting.text} 🩷</p>
          <Button asChild variant="hero" size="sm" className="mt-2" onClick={() => setShow(false)}>
            <Link to="/journal/new">
              <PenLine /> Tell my journal
            </Link>
          </Button>
        </div>
        <button
          type="button"
          onClick={() => {
            audio.current?.pause();
            setShow(false);
          }}
          aria-label="Close greeting"
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
