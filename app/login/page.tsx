import { LoginPage } from "@/components/login-page";

type Props = {
  searchParams: Promise<{
    error?: string;
    error_description?: string;
    reason?: string;
  }>;
};

export default async function LoginRoute({ searchParams }: Props) {
  const search = await searchParams;
  return (
    <LoginPage
      error={search.error_description || search.error}
      reason={search.reason === "share" ? "share" : undefined}
    />
  );
}
