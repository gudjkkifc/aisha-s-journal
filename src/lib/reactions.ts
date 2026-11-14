import { supabase } from "@/integrations/supabase/client";

export const REACTION_EMOJIS = ["🩷", "👍", "😂", "🥰", "😮", "😢", "🙏", "⚠️", "🚫"] as const;

export type Reaction = {
  id: string;
  entry_id: string;
  line_index: number;
  line_text: string;
  emoji: string;
  reactor_id: string;
  created_at: string;
};

export type ReactionChip = { emoji: string; count: number; mineId: string | null };

/** An entry's body split into lines; each line can receive its own reactions. */
export function splitLines(body: string): string[] {
  return body.replace(/\r\n?/g, "\n").split("\n");
}

function toChips(reactions: Reaction[], userId: string | undefined): ReactionChip[] {
  const byEmoji = new Map<string, ReactionChip>();
  for (const r of reactions) {
    const chip = byEmoji.get(r.emoji) ?? { emoji: r.emoji, count: 0, mineId: null };
    chip.count += 1;
    if (r.reactor_id === userId) chip.mineId = r.id;
    byEmoji.set(r.emoji, chip);
  }
  return [...byEmoji.values()];
}

/**
 * Places each reaction on the line it was given to. If the writer has since edited the entry,
 * the reaction follows its original line text; reactions whose text no longer exists are returned
 * separately as `orphans` so they are never shown next to the wrong words.
 */
export function placeReactions(lines: string[], reactions: Reaction[], userId?: string) {
  const perLine = new Map<number, Reaction[]>();
  const orphans: Reaction[] = [];
  for (const r of reactions) {
    let index = -1;
    if (lines[r.line_index] === r.line_text) index = r.line_index;
    else if (r.line_text.trim()) index = lines.indexOf(r.line_text);
    if (index < 0) {
      orphans.push(r);
      continue;
    }
    perLine.set(index, [...(perLine.get(index) ?? []), r]);
  }
  const chips = new Map<number, ReactionChip[]>();
  for (const [index, list] of perLine) chips.set(index, toChips(list, userId));
  return { chips, orphans };
}

export const entryReactionsQuery = (entryId: string) => ({
  queryKey: ["reactions", entryId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("entry_reactions")
      .select("*")
      .eq("entry_id", entryId)
      .order("created_at");
    if (error) throw error;
    return data as Reaction[];
  },
});

export const allReactionsQuery = {
  queryKey: ["reactions", "all"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("entry_reactions")
      .select("*")
      .order("created_at")
      .limit(5000);
    if (error) throw error;
    return data as Reaction[];
  },
};

export async function addReaction(entryId: string, lineIndex: number, lineText: string, emoji: string) {
  const { error } = await supabase
    .from("entry_reactions")
    .insert({ entry_id: entryId, line_index: lineIndex, line_text: lineText, emoji });
  // Reacting twice with the same emoji is a no-op, not an error.
  if (error && error.code !== "23505") throw error;
}

export async function removeReaction(id: string) {
  const { error } = await supabase.from("entry_reactions").delete().eq("id", id);
  if (error) throw error;
}
