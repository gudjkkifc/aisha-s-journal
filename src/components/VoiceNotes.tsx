import { Mic } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { useSignedUrls } from "@/lib/journal";
import { cn } from "@/lib/utils";

/** Plays an entry's saved voice notes. */
export function VoiceNotes({ paths, className }: { paths: string[]; className?: string }) {
  const { data } = useSignedUrls(paths);
  if (!paths.length) return null;
  return (
    <ul className={cn("space-y-2", className)}>
      {paths.map((p, i) => (
        <li key={p}>
          <VoiceNotePlayer label={`Voice note ${i + 1}`} src={data?.[p]} />
        </li>
      ))}
    </ul>
  );
}

export function VoiceNotePlayer({
  label,
  src,
  children,
}: {
  label: string;
  src?: string | undefined;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-secondary/60 p-2 pl-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
        <Mic className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-secondary-foreground">{label}</p>
        {src ? (
          <audio controls preload="metadata" src={src} className="mt-1 h-9 w-full">
            Your browser can't play this voice note.
          </audio>
        ) : (
          <Skeleton className="mt-1 h-9 w-full rounded-full" />
        )}
      </div>
      {children}
    </div>
  );
}
