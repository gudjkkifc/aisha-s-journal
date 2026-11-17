import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookHeart, CalendarDays, ListChecks, LogOut, ShieldCheck, UserRound } from "lucide-react";

import { Heart } from "@/components/Heart";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth, useIsAdmin, useSignOut } from "@/lib/auth";
import { profileQuery } from "@/lib/journal";
import { applyDark, applyHue, journalOwner } from "@/lib/theme";

export function SiteHeader() {
  const { user, loading } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const signOut = useSignOut();
  const { data: profile } = useQuery({
    ...profileQuery(user?.id ?? ""),
    enabled: !!user,
  });
  const ownerName = journalOwner(
    profile?.display_name || (user?.user_metadata?.["display_name"] as string | undefined),
    !!user,
  );

  // Each person's chosen site colour follows them; signed-out visitors see the default pink.
  useEffect(() => {
    if (loading) return;
    if (!user) {
      applyHue(null);
      applyDark(false);
    } else if (profile) {
      applyHue(profile.theme_hue);
      applyDark(profile.theme_dark);
    }
  }, [loading, user, profile]);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <Heart className="h-7 w-7 text-primary" />
          <span className="truncate pr-2 font-display text-xl font-semibold tracking-tight">
            {ownerName} <span className="font-script text-2xl text-primary">journal</span>
          </span>
        </Link>

        {loading ? null : user ? (
          <div className="flex items-center gap-1">
            <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
              <Link to="/journal">
                <BookHeart /> My journal
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
              <Link to="/calendar">
                <CalendarDays /> Calendar
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
              <Link to="/bucket-list">
                <ListChecks /> Bucket list
              </Link>
            </Button>
            {isAdmin && (
              <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
                <Link to="/admin">
                  <ShieldCheck /> Admin
                </Link>
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <UserAvatar
                  path={profile?.avatar_path}
                  name={profile?.display_name || user.email}
                  className="h-9 w-9"
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
                  {profile?.display_name || user.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/journal">
                    <BookHeart /> My journal
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/calendar">
                    <CalendarDays /> Calendar
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/bucket-list">
                    <ListChecks /> Bucket list
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin">
                      <ShieldCheck /> Admin panel
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link to="/profile">
                    <UserRound /> Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOut /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <Button asChild size="sm">
            <Link to="/auth" search={{}}>
              Sign in
            </Link>
          </Button>
        )}
      </div>
    </header>
  );
}
