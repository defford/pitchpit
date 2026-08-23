export function recordCompanyClick(companyId: string) {
  if (!companyId) return;
  void fetch(`/api/companies/${encodeURIComponent(companyId)}/click`, {
    method: "POST",
    keepalive: true,
  });
}
