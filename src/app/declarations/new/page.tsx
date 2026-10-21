"use client";

import AppShell, { AuthLoading } from "@/components/AppShell";
import DeclarationWizard from "@/components/wizard/DeclarationWizard";
import { useRequireAuth } from "@/lib/auth";

export default function NewDeclarationPage() {
  const { user, accessToken, ready, authorized } = useRequireAuth();

  if (!ready || !authorized || !user || !accessToken) {
    return <AuthLoading />;
  }

  return (
    <AppShell>
      <DeclarationWizard user={user} accessToken={accessToken} />
    </AppShell>
  );
}
