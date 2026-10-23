"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { AuthLoading, Brand } from "@/components/AppShell";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { safeInternalPath } from "@/lib/navigation";

function LoginPageContent() {
  const { ready, user, login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeInternalPath(searchParams.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (ready && user) {
      router.replace(redirectTo);
    }
  }, [ready, redirectTo, router, user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) {
      return;
    }
    if (!email.trim() || !password) {
      setError("Ingresa tu correo electrónico y tu contraseña.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await login(email, password);
      router.replace(redirectTo);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-10 sm:px-6">
      <div className="w-full max-w-md">
        <div className="flex justify-center">
          <Brand href="/" />
        </div>

        <Card className="mt-6 p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">
            Acceso seguro
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            Inicia sesión
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Accede a tu panel para crear, revisar y descargar tus declaraciones
            de renta.
          </p>

          {error && (
            <div
              role="alert"
              className="mt-5 flex gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
            >
              <span
                aria-hidden="true"
                className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-rose-100 text-xs font-bold text-rose-700"
              >
                !
              </span>
              <p className="leading-5">{error}</p>
            </div>
          )}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-slate-700"
              >
                Correo electrónico
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                aria-required="true"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="tu@correo.com"
                className="mt-2"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-slate-700"
              >
                Contraseña
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                aria-required="true"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                className="mt-2"
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              aria-busy={submitting}
              className="mt-2 w-full"
            >
              {submitting ? "Ingresando…" : "Ingresar"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            ¿Aún no tienes cuenta?{" "}
            <Link
              href="/register"
              className="font-semibold text-indigo-600 underline-offset-4 hover:text-indigo-700 hover:underline"
            >
              Crear una cuenta
            </Link>
          </p>
        </Card>

        {process.env.NODE_ENV !== "production" && (
          <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-white/70 px-4 py-3 text-xs text-slate-600">
            <p className="font-semibold text-slate-700">Acceso de demostración</p>
            <p className="mt-1">demo.phase7@gmail.com · Demo1234</p>
          </div>
        )}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <LoginPageContent />
    </Suspense>
  );
}
