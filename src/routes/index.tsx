import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Camera, Lock, PenLine } from "lucide-react";

import heroImage from "@/assets/journal-hero.jpg";
import { Heart } from "@/components/Heart";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { profileQuery } from "@/lib/journal";
import { journalOwner } from "@/lib/theme";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aisha's journal — your private pink diary" },
      {
        name: "description",
        content: "Write about your day, save photos and keep your memories safe in Aisha's journal.",
      },
      { property: "og:title", content: "Aisha's journal — your private pink diary" },
      {
        property: "og:description",
        content: "Write about your day, save photos and keep your memories safe in Aisha's journal.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { user } = useAuth();
  const { data: profile } = useQuery({ ...profileQuery(user?.id ?? ""), enabled: !!user });
  const ownerName = journalOwner(
    profile?.display_name || (user?.user_metadata?.["display_name"] as string | undefined),
    !!user,
  );

  return (
    <main className="mx-auto max-w-5xl px-4 pb-20">
      <section className="grid items-center gap-10 pt-10 md:grid-cols-[1.05fr_1fr] md:pt-16">
        <div className="space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
            <Heart className="h-3.5 w-3.5 text-primary" /> Dear diary, today…
          </span>
          <h1 className="text-5xl font-semibold leading-[1.05] sm:text-6xl">
            {ownerName}{" "}
            <span className="font-script text-6xl text-primary sm:text-7xl">journal</span>
          </h1>
          <p className="max-w-md text-lg text-muted-foreground">
            A soft little corner of the internet to write about your days, tuck in your favourite
            photos and keep every memory close.
          </p>
          <div className="flex flex-wrap gap-3">
            {user ? (
              <Button asChild variant="hero" size="lg">
                <Link to="/journal/new">
                  <PenLine /> Write today's entry
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="hero" size="lg">
                  <Link to="/auth" search={{ mode: "signup" }}>
                    Start my journal
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/auth" search={{}}>
                    I have an account
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="relative">
          <Heart className="animate-float-heart absolute -left-3 -top-4 z-10 h-12 w-12 text-primary-glow" />
          <div className="polaroid rotate-2 pb-10">
            <img
              src={heroImage}
              alt="An open pink journal with peonies and polaroid photos"
              width={1280}
              height={1024}
              className="w-full rounded-sm object-cover"
            />
            <p className="absolute bottom-2 left-0 right-0 text-center font-script text-2xl text-muted-foreground">
              my favourite things ♡
            </p>
          </div>
        </div>
      </section>

      <section className="mt-20 grid gap-4 sm:grid-cols-3">
        {[
          { icon: PenLine, title: "Write freely", text: "Pour out your thoughts on soft ruled pages." },
          { icon: Camera, title: "Add photos", text: "Up to six snapshots on every entry." },
          { icon: Lock, title: "Kept private", text: "Only you can read your entries." },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title} className="paper-card p-6">
            <div className="mb-4 grid h-11 w-11 place-items-center rounded-full bg-rose-gradient text-primary-foreground shadow-glow">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="text-xl font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{text}</p>
          </div>
        ))}
      </section>

      <p className="mt-12 text-center text-xs text-muted-foreground">
        To keep everyone safe, entries may be reviewed by our moderator to remove hateful or
        illegal content.
      </p>
    </main>
  );
}
