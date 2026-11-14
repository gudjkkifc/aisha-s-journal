import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, ShieldCheck } from "lucide-react";

import { UserAvatar } from "@/components/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

const ONLINE_WINDOW_MS = 70 * 60 * 1000; // sessions refresh about every hour while the site is open

function timeAgo(iso: string | null) {
  if (!iso) return "never";
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, secs] of steps) {
    if (Math.abs(diff) >= secs) return rtf.format(Math.round(diff / secs), unit);
  }
  return "just now";
}

export function AdminUsers() {
  const [search, setSearch] = useState("");
  const { data: users, isLoading, error } = useQuery({
    queryKey: ["admin-users"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_users");
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users ?? [];
    return (users ?? []).filter((u) =>
      [u.display_name, u.email].some((t) => (t ?? "").toLowerCase().includes(q)),
    );
  }, [users, search]);

  const signedIn = users?.filter((u) => u.signed_in).length ?? 0;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
      </div>
    );
  }
  if (error) {
    return <div className="paper-card p-10 text-center text-muted-foreground">Couldn't load users.</div>;
  }

  return (
    <div>
      <p className="mb-3 text-sm text-muted-foreground">
        {users?.length ?? 0} {users?.length === 1 ? "account" : "accounts"} · {signedIn} signed in right now
      </p>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or email…"
          className="rounded-full bg-card pl-9"
        />
      </div>
      {!filtered.length ? (
        <div className="paper-card p-10 text-center text-muted-foreground">No one matches your search.</div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((u) => {
            const online =
              u.signed_in && !!u.last_active_at && Date.now() - new Date(u.last_active_at).getTime() < ONLINE_WINDOW_MS;
            return (
              <li key={u.id} className="paper-card flex items-center gap-3 p-4">
                <div className="relative shrink-0">
                  <UserAvatar path={u.avatar_path} name={u.display_name || u.email} className="h-11 w-11" />
                  {online && (
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card bg-primary" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate font-semibold">
                    <span className="truncate">{u.display_name || "No name yet"}</span>
                    {u.is_admin && <ShieldCheck className="h-4 w-4 shrink-0 text-primary" aria-label="Admin" />}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">{u.email}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {Number(u.entry_count)} {Number(u.entry_count) === 1 ? "entry" : "entries"} · joined{" "}
                    {new Date(u.joined_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}{" "}
                    · active {timeAgo(u.last_active_at)}
                  </p>
                </div>
                <Badge variant={u.signed_in ? "default" : "outline"} className="shrink-0">
                  {online ? "Online" : u.signed_in ? "Signed in" : "Signed out"}
                </Badge>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
