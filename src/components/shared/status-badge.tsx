import { Badge } from "@/components/ui/badge";

type StatusBadgeProps = {
  isActive: boolean;
  expiresAt?: string | Date | null;
};

const isExpired = (value?: string | Date | null) => {
  if (!value) {
    return false;
  }

  const date = value instanceof Date ? value : new Date(value);
  return date.getTime() <= Date.now();
};

export function StatusBadge({ isActive, expiresAt }: StatusBadgeProps) {
  if (isExpired(expiresAt)) {
    return (
      <Badge className="border border-[var(--warning)]/40 bg-[var(--warning)]/15 text-[var(--warning)]">
        Expired
      </Badge>
    );
  }

  if (!isActive) {
    return (
      <Badge className="border border-muted bg-muted text-muted-foreground">
        Inactive
      </Badge>
    );
  }

  return (
    <Badge className="border border-[var(--success)]/40 bg-[var(--success)]/15 text-[var(--success)]">
      Active
    </Badge>
  );
}
