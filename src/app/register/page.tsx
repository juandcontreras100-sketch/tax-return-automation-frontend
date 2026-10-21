"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Brand } from "@/components/AppShell";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const selectClassName =
  "mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

function passwordProblem(value: string): string | null {
  if (value.length < 8) {
    return "La contraseña debe tener al menos 8 caracteres.";
  }
  if (!/[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/.test(value)) {
    return "La contraseña debe incluir al menos una letra.";
  }
  if (!/\d/.test(value)) {
    return "La contraseña debe incluir al menos un número.";
  }
  return null;
}

export default function RegisterPage() {
  const { ready, user, register } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [documentType, setDocumentType] = useState("CC");
  const [documentNumber, setDocumentNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (ready && user) {
      router.replace("/dashboard");
    }
  }, [ready, router, user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) {
      return;
    }

    const trimmedEmail = email.trim();
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedDocumentNumber = documentNumber.trim();

    if (
      !trimmedEmail ||
      !password ||
      !trimmedFirstName ||
      !trimmedLastName ||
      !trimmedDocumentNumber
    ) {
      setError("Completa todos los campos obligatorios.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Ingresa un correo electrónico válido.");
      return;
    }

    const problem = passwordProblem(password);
    if (problem) {
      setError(problem);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await register({
        email: trimmedEmail,
        password,
        first_name: trimmedFirstName,
        last_name: trimmedLastName,
        document_type: documentType,
        document_number: trimmedDocumentNumber,
        phone: phone.trim() || undefined,
      });
      router.replace("/dashboard");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-10 sm:px-6">
      <div className="w-full max-w-2xl">
        <div className="flex justify-center">
          <Brand href="/" />
        </div>

        <Card className="mt-6 p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">
            Nueva cuenta
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            Crea tu cuenta
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Registra tus datos para preparar y gestionar tus declaraciones de
            renta.
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
                Correo electrónico <span className="text-rose-600">*</span>
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
                Contraseña <span className="text-rose-600">*</span>
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                aria-required="true"
                aria-describedby="password-help"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="mt-2"
              />
              <p id="password-help" className="mt-1.5 text-xs text-slate-500">
                Debe tener al menos 8 caracteres e incluir una letra y un
                número.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="first_name"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Nombre <span className="text-rose-600">*</span>
                </label>
                <Input
                  id="first_name"
                  name="first_name"
                  autoComplete="given-name"
                  required
                  aria-required="true"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  placeholder="Ana"
                  className="mt-2"
                />
              </div>
              <div>
                <label
                  htmlFor="last_name"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Apellido <span className="text-rose-600">*</span>
                </label>
                <Input
                  id="last_name"
                  name="last_name"
                  autoComplete="family-name"
                  required
                  aria-required="true"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  placeholder="Pérez"
                  className="mt-2"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="document_type"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Tipo de documento <span className="text-rose-600">*</span>
                </label>
                <select
                  id="document_type"
                  name="document_type"
                  required
                  value={documentType}
                  onChange={(event) => setDocumentType(event.target.value)}
                  className={selectClassName}
                >
                  <option value="CC">Cédula de ciudadanía (CC)</option>
                  <option value="CE">Cédula de extranjería (CE)</option>
                  <option value="NIT">NIT</option>
                  <option value="PP">Pasaporte (PP)</option>
                  <option value="TI">Tarjeta de identidad (TI)</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="document_number"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Número de documento <span className="text-rose-600">*</span>
                </label>
                <Input
                  id="document_number"
                  name="document_number"
                  inputMode="numeric"
                  required
                  aria-required="true"
                  value={documentNumber}
                  onChange={(event) => setDocumentNumber(event.target.value)}
                  placeholder="1020304050"
                  className="mt-2"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-semibold text-slate-700"
              >
                Teléfono <span className="font-normal text-slate-500">(opcional)</span>
              </label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="300 123 4567"
                className="mt-2"
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              aria-busy={submitting}
              className="mt-2 w-full"
            >
              {submitting ? "Creando cuenta…" : "Crear cuenta"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            ¿Ya tienes una cuenta?{" "}
            <Link
              href="/login"
              className="font-semibold text-indigo-600 underline-offset-4 hover:text-indigo-700 hover:underline"
            >
              Inicia sesión
            </Link>
          </p>
        </Card>
      </div>
    </main>
  );
}
