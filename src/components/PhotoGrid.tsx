import { useState } from "react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useSignedUrls } from "@/lib/journal";
import { cn } from "@/lib/utils";

export function PhotoGrid({ paths, className }: { paths: string[]; className?: string }) {
  const { data, isLoading } = useSignedUrls(paths);
  const [open, setOpen] = useState<string | null>(null);
  if (!paths.length) return null;

  return (
    <>
      <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3", className)}>
        {paths.map((p, i) => (
          <button
            key={p}
            type="button"
            onClick={() => data?.[p] && setOpen(data[p])}
            className={cn(
              "polaroid block transition-transform hover:rotate-0 hover:scale-[1.02]",
              i % 2 === 0 ? "-rotate-1" : "rotate-1",
            )}
          >
            {isLoading || !data?.[p] ? (
              <Skeleton className="aspect-square w-full rounded-sm" />
            ) : (
              <img
                src={data[p]}
                alt="Journal photo"
                loading="lazy"
                className="aspect-square w-full rounded-sm object-cover"
              />
            )}
          </button>
        ))}
      </div>
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-3xl border-none bg-transparent p-0 shadow-none">
          <DialogTitle className="sr-only">Photo</DialogTitle>
          {open && <img src={open} alt="Journal photo" className="w-full rounded-xl" />}
        </DialogContent>
      </Dialog>
    </>
  );
}
