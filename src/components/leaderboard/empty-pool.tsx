export function EmptyPool({ hint }: { hint: string }) {
  return (
    <li className="border-b border-border px-4 py-6 sm:px-5">
      <p className="font-data text-[10px] tracking-[0.18em] text-muted-foreground">
        OPEN SLOTS
      </p>
      <p className="font-display mt-1 text-lg tracking-[0.06em] text-silver">
        No names listed yet
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
    </li>
  );
}
