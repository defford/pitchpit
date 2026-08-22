import { LoginForm } from "./login-form";
import { sanitizeNextPath } from "@/lib/validation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <LoginForm
      next={sanitizeNextPath(params.next, "/dashboard")}
      authError={params.error === "auth"}
    />
  );
}
