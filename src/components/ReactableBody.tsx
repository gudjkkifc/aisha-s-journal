import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { SmilePlus } from "lucide-react";
import { toast } from "sonner";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  addReaction,
  placeReactions,
  REACTION_EMOJIS,
  removeReaction,
  splitLines,
  type Reaction,
  type ReactionChip,
} from "@/lib/reactions";
import { cn } from "@/lib/utils";

type Props = {
  entryId: string;
  body: string;
  reactions: Reaction[];
  /** Admins can add and remove their own reactions; writers only see them. */
  canReact: boolean;
  userId?: string;
  className?: string;
};

export function ReactableBody({ entryId, body, reactions, canReact, userId, className }: Props) {
  const queryClient = useQueryClient();
  const lines = splitLines(body);
  const { chips, orphans } = placeReactions(lines, reactions, userId);

  async function run(action: () => Promise<void>) {
    try {
      await action();
      await queryClient.invalidateQueries({ queryKey: ["reactions"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save the reaction");
    }
  }

  return (
    <div className={className}>
      {lines.map((text, index) => {
        const lineChips = chips.get(index) ?? [];
        const blank = !text.trim();
        return (
          <div
            key={index}
            className={cn(
              "group min-h-8 whitespace-pre-wrap rounded-sm",
              lineChips.length > 0 && "bg-primary/10",
            )}
          >
            {blank ? "\u00a0" : text}
            {(lineChips.length > 0 || (canReact && !blank)) && (
              <span className="ml-2 inline-flex flex-wrap items-center gap-1 align-middle">
                {lineChips.map((chip) => (
                  <Chip
                    key={chip.emoji}
                    chip={chip}
                    canRemove={canReact && !!chip.mineId}
                    onToggle={() =>
                      run(() =>
                        chip.mineId
                          ? removeReaction(chip.mineId)
                          : addReaction(entryId, index, text, chip.emoji),
                      )
                    }
                    canAdd={canReact}
                  />
                ))}
                {canReact && !blank && (
                  <EmojiPicker onPick={(emoji) => run(() => addReaction(entryId, index, text, emoji))} />
                )}
              </span>
            )}
          </div>
        );
      })}

      {orphans.length > 0 && (
        <div className="mt-3 border-t border-dashed border-border pt-2 text-sm text-muted-foreground">
          <p className="text-xs font-semibold uppercase tracking-wide">On words that were changed</p>
          <ul className="mt-1 space-y-1">
            {orphans.map((r) => (
              <li key={r.id} className="flex items-center gap-2">
                <span className="text-base">{r.emoji}</span>
                <span className="truncate italic">“{r.line_text}”</span>
                {canReact && r.reactor_id === userId && (
                  <button
                    type="button"
                    className="ml-auto text-xs font-medium text-primary hover:underline"
                    onClick={() => run(() => removeReaction(r.id))}
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Chip({
  chip,
  canRemove,
  canAdd,
  onToggle,
}: {
  chip: ReactionChip;
  canRemove: boolean;
  canAdd: boolean;
  onToggle: () => void;
}) {
  const interactive = canRemove || canAdd;
  return (
    <button
      type="button"
      disabled={!interactive}
      onClick={onToggle}
      title={canRemove ? "Remove your reaction" : undefined}
      aria-label={`${chip.emoji} reaction${chip.count > 1 ? `, ${chip.count}` : ""}`}
      className={cn(
        "inline-flex h-6 items-center gap-0.5 rounded-full border bg-card px-1.5 text-sm leading-none shadow-sm",
        chip.mineId ? "border-primary" : "border-border",
        interactive ? "cursor-pointer hover:bg-secondary" : "cursor-default",
      )}
    >
      <span>{chip.emoji}</span>
      {chip.count > 1 && <span className="text-xs font-semibold text-muted-foreground">{chip.count}</span>}
    </button>
  );
}

function EmojiPicker({ onPick }: { onPick: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="React to this line"
          className="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground opacity-60 transition hover:bg-secondary hover:text-primary hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 sm:opacity-0 sm:group-hover:opacity-60"
        >
          <SmilePlus className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-1.5" align="start">
        <div className="flex flex-wrap gap-0.5">
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              aria-label={`React with ${emoji}`}
              className="h-9 w-9 rounded-full text-xl transition hover:scale-110 hover:bg-secondary"
              onClick={() => {
                onPick(emoji);
                setOpen(false);
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
