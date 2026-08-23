"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { CompanyIdentity } from "@/components/company-mark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type AdminCompany = {
  id: string;
  name: string;
  pitch: string;
  website_url: string;
  logo_path: string | null;
  click_count?: number;
  tier: string;
  status: string;
  preferred_billing_mode: string;
  owner_email?: string | null;
  review_notes?: string | null;
  placement_status?: string | null;
};

export default function AdminPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/companies");
      if (res.status === 401 || res.status === 403) {
        router.push("/admin/login?next=/admin");
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setCompanies(data.companies ?? []);
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

  async function review(
    id: string,
    status: "approved" | "rejected" | "suspended",
  ) {
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/companies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          review_notes: notes[id] || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      setMessage(`${data.company?.name ?? "Company"} marked ${status}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-10">
      <div>
        <h1 className="font-display text-4xl tracking-[0.08em] text-foreground">
          MODERATION
        </h1>
        <p className="mt-2 text-sm text-silver">
          Suspend listings that do not belong. Public submits go live on the card
          right away.
        </p>
      </div>

      {message ? (
        <Alert>
          <AlertTitle>Updated</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Companies</CardTitle>
          <CardDescription>
            Review queue across draft, pending, approved, rejected, and
            suspended.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : companies.length === 0 ? (
            <p className="text-muted-foreground">No companies yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Notes / Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <CompanyIdentity
                            name={company.name}
                            logoUrl={company.logo_path}
                            websiteUrl={company.website_url}
                            companyId={company.id}
                            clickCount={company.click_count}
                            size="sm"
                            nameClassName="font-medium text-foreground"
                          />
                          <p className="max-w-xs text-xs text-muted-foreground">
                            {company.pitch}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{company.tier}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{company.status}</Badge>
                        {company.placement_status ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            placement: {company.placement_status}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {company.owner_email ?? "—"}
                      </TableCell>
                      <TableCell className="min-w-[220px] space-y-2">
                        <Textarea
                          placeholder="Review notes"
                          value={notes[company.id] ?? ""}
                          onChange={(e) =>
                            setNotes((n) => ({
                              ...n,
                              [company.id]: e.target.value,
                            }))
                          }
                          rows={2}
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            onClick={() => review(company.id, "approved")}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => review(company.id, "rejected")}
                          >
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => review(company.id, "suspended")}
                          >
                            Suspend
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
