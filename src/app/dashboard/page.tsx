"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { Tier } from "@/config/tiers";
import { TIERS } from "@/config/tiers";
import { formatPriceCents } from "@/lib/data/company-guide";
import type { PoolQuote } from "@/lib/domain/pricing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CompanyLink, CompanyMark } from "@/components/company-mark";

type Company = {
  id: string;
  name: string;
  pitch: string;
  website_url: string;
  logo_path: string | null;
  click_count?: number;
  tier: Tier;
  status: string;
  review_notes: string | null;
};

const emptyForm = {
  name: "",
  pitch: "",
  website_url: "",
  tier: "pit" as Tier,
};

export default function DashboardPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [quotes, setQuotes] = useState<Record<Tier, PoolQuote> | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeCompany = useMemo(() => companies[0] ?? null, [companies]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [res, pricingRes] = await Promise.all([
        fetch("/api/companies"),
        fetch("/api/listings"),
      ]);
      if (res.status === 401) {
        router.push("/login?next=/dashboard");
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setCompanies(data.companies ?? []);
      if (pricingRes.ok) {
        const pricing = (await pricingRes.json()) as {
          pools?: Record<Tier, PoolQuote>;
        };
        if (pricing.pools) setQuotes(pricing.pools);
      }
      if (data.companies?.[0]) {
        const c = data.companies[0] as Company;
        setForm({
          name: c.name,
          pitch: c.pitch,
          website_url: c.website_url,
          tier: c.tier,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const id = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveCompany(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(
        activeCompany ? `/api/companies/${activeCompany.id}` : "/api/companies",
        {
          method: activeCompany ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            pitch: form.pitch,
            website_url: form.website_url,
            tier: form.tier,
            billingMode: "one_day",
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setMessage(
        activeCompany
          ? "Company updated and submitted for review."
          : "Company submitted for review.",
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function startCheckout() {
    if (!activeCompany) return;
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: activeCompany.id,
          billingMode: "one_day",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setMessage(data.message || "Checkout session created.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    }
  }

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <p className="text-muted-foreground">Loading dashboard…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-10">
      <div>
        <h1 className="font-display text-4xl tracking-[0.08em] text-foreground">
          COMPANY DASHBOARD
        </h1>
        <p className="mt-2 text-sm text-silver">
          Submit your pitch, wait for approval, then pay to list.
        </p>
      </div>

      {message ? (
        <Alert>
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {activeCompany ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <CompanyLink
                name={activeCompany.name}
                companyId={activeCompany.id}
                websiteUrl={activeCompany.website_url}
                clickCount={activeCompany.click_count}
                className="items-center gap-3 pb-2.5"
              >
                <CompanyMark
                  name={activeCompany.name}
                  logoUrl={activeCompany.logo_path}
                  websiteUrl={activeCompany.website_url}
                  size="md"
                />
                <span>{activeCompany.name}</span>
              </CompanyLink>
              <Badge variant="secondary">{activeCompany.status}</Badge>
            </CardTitle>
            <CardDescription>
              Approval is required before checkout. Rejected submissions are
              never charged.
            </CardDescription>
          </CardHeader>
          {activeCompany.review_notes ? (
            <CardContent>
              <p className="text-sm text-silver">
                Review notes: {activeCompany.review_notes}
              </p>
            </CardContent>
          ) : null}
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Your company</CardTitle>
          <CardDescription>
            Name, website, and pitch. The logo is pulled from the website
            automatically. Choose your preferred pool.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={saveCompany}>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <div className="flex items-center gap-3">
                <CompanyMark
                  name={form.name || "Company"}
                  logoUrl={
                    form.website_url === activeCompany?.website_url
                      ? activeCompany?.logo_path
                      : null
                  }
                  websiteUrl={form.website_url}
                  size="md"
                />
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  required
                  minLength={2}
                  maxLength={80}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                placeholder="https://"
                value={form.website_url}
                onChange={(e) =>
                  setForm((f) => ({ ...f, website_url: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pitch">Pitch</Label>
              <Textarea
                id="pitch"
                value={form.pitch}
                onChange={(e) =>
                  setForm((f) => ({ ...f, pitch: e.target.value }))
                }
                required
                minLength={20}
                maxLength={500}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Pool tier</Label>
              <Select
                value={form.tier}
                onValueChange={(value) =>
                  setForm((f) => ({ ...f, tier: value as Tier }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TIERS) as Tier[]).map((tier) => {
                    const quote = quotes?.[tier];
                    const price = quote
                      ? formatPriceCents(quote.priceCents)
                      : `$${TIERS[tier].priceCents / 100}`;
                    return (
                      <SelectItem key={tier} value={tier}>
                        {`${TIERS[tier].boardLabel} (${price}/day)`}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={saving}>
              {saving
                ? "Saving…"
                : activeCompany
                  ? "Update & submit"
                  : "Submit for review"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pay</CardTitle>
          <CardDescription>
            Checkout uses the live pool price: $1 until that board fills, then
            list price. Pay once to list.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button
            disabled={!activeCompany || activeCompany.status !== "approved"}
            onClick={() => startCheckout()}
          >
            Pay to list
            {quotes && activeCompany
              ? ` · ${formatPriceCents(quotes[activeCompany.tier].priceCents)}`
              : ""}
          </Button>
          <Button asChild variant="ghost">
            <Link href="/">View the Rankings</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
