"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CARD_ROSTER_NEEDED, TIERS, type Tier } from "@/config/tiers";
import { formatPriceCents } from "@/lib/data/company-guide";
import { quotePools, type PoolQuote } from "@/lib/domain/pricing";
import { cn } from "@/lib/utils";

const TIER_ORDER: Tier[] = ["pit", "undercard", "main_event"];

const FALLBACK_QUOTES = quotePools({ pit: 0, undercard: 0, main_event: 0 });

type ListingFormProps = {
  quotes?: Record<Tier, PoolQuote>;
  warmup?: boolean;
};

export function ListingForm({
  quotes = FALLBACK_QUOTES,
  warmup = false,
}: ListingFormProps) {
  const [website, setWebsite] = useState("");
  const [pitch, setPitch] = useState("");
  const [tier, setTier] = useState<Tier>("pit");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const selected = quotes[tier];
  const price = formatPriceCents(selected.priceCents);
  const busy = status === "saving";

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus("saving");
    setMessage(null);

    try {
      const response = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pitch,
          website_url: website,
          tier,
        }),
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
        url?: string;
      } | null;

      if (!response.ok || !data?.url) {
        setStatus("error");
        setMessage(data?.error || "Could not start checkout.");
        return;
      }

      window.location.assign(data.url);
    } catch {
      setStatus("error");
      setMessage("Could not reach the server. Try again in a moment.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="space-y-2">
        <Label htmlFor="listing-link">Your link</Label>
        <Input
          id="listing-link"
          type="text"
          inputMode="url"
          required
          autoComplete="url"
          placeholder="https://yourcompany.com"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="listing-pitch">Pitch</Label>
        <Textarea
          id="listing-pitch"
          required
          minLength={20}
          maxLength={500}
          rows={4}
          placeholder="What are you, and why should you be first?"
          value={pitch}
          onChange={(event) => setPitch(event.target.value)}
        />
        <p className="font-data text-[10px] tracking-[0.14em] text-muted-foreground">
          {pitch.trim().length}/500 · 20 CHARACTER FLOOR
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">
          {warmup ? "Pick a pool and fill the card" : "Pool"}
        </legend>
        <div className="grid gap-px overflow-hidden border border-border bg-border sm:grid-cols-3">
          {TIER_ORDER.map((option) => {
            const config = TIERS[option];
            const quote = quotes[option];
            const selectedPool = tier === option;
            const needed = CARD_ROSTER_NEEDED[option];
            const filled = Math.min(quote.occupied, needed);
            const remaining = Math.max(0, needed - quote.occupied);
            const progress = (filled / needed) * 100;
            return (
              <button
                key={option}
                type="button"
                aria-pressed={selectedPool}
                onClick={() => setTier(option)}
                className={cn(
                  "flex flex-col items-start bg-card px-4 py-4 text-left transition",
                  selectedPool
                    ? "bg-muted text-foreground"
                    : "text-silver hover:text-foreground",
                )}
              >
                <span className="font-display text-lg tracking-[0.06em]">
                  {config.boardLabel}
                </span>
                {warmup ? (
                  <>
                    <span className="font-data mt-2 text-[10px] tracking-[0.14em] text-muted-foreground">
                      {filled}/{needed} FOR THE CARD
                      {remaining > 0 ? ` · ${remaining} TO GO` : " · SET"}
                    </span>
                    <span
                      className="mt-2 h-1 w-full bg-border"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={needed}
                      aria-valuenow={filled}
                      aria-label={`${config.boardLabel} listed toward the card`}
                    >
                      <span
                        className="block h-full bg-signal"
                        style={{ width: `${progress}%` }}
                      />
                    </span>
                  </>
                ) : (
                  <span className="mt-2 font-data text-[10px] tracking-[0.14em] text-muted-foreground">
                    {quote.occupied}/{quote.capacity} LISTED
                    {quote.intro
                      ? ` · THEN ${formatPriceCents(quote.fullPriceCents)}`
                      : ""}
                  </span>
                )}
                <span className="font-display mt-2 text-2xl tracking-[0.04em] text-foreground">
                  {formatPriceCents(quote.priceCents)}
                  <span className="ml-1 font-data text-[10px] tracking-[0.14em] text-muted-foreground">
                    /DAY
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button
          type="submit"
          size="lg"
          disabled={busy}
          className="w-full sm:w-auto"
        >
          {busy
            ? "Sending you to pay…"
            : `Pay ${price} · enter ${TIERS[tier].boardLabel}`}
        </Button>
        {warmup ? (
          <Button asChild size="lg" variant="outline">
            <Link href="/the-pitch-pit">Play an exhibition</Link>
          </Button>
        ) : null}
      </div>

      {message ? <p className="text-sm text-destructive">{message}</p> : null}
    </form>
  );
}
