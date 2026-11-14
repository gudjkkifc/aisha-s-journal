import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSignedUrls } from "@/lib/journal";
import { cn } from "@/lib/utils";

export function UserAvatar({
  path,
  name,
  className,
}: {
  path: string | null | undefined;
  name: string | null | undefined;
  className?: string;
}) {
  const { data } = useSignedUrls(path ? [path] : []);
  const url = path ? data?.[path] : undefined;
  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <Avatar className={cn("border-2 border-blush", className)}>
      {url && <AvatarImage src={url} alt={name ?? "Avatar"} className="object-cover" />}
      <AvatarFallback className="bg-secondary font-display text-secondary-foreground">
        {initial}
      </AvatarFallback>
    </Avatar>
  );
}
