"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import AppShell, { AuthLoading } from "@/components/AppShell";
import AgentTimeline from "@/components/processing/AgentTimeline";
import ProcessingStatus, {
  type ProcessingStatusTone,
} from "@/components/processing/ProcessingStatus";
import ProgressBar from "@/components/processing/ProgressBar";
import {
  countCompletedAgents,
  createInitialProcessingState,
  getProcessingProgress,
  getRunningAgent,
  processingReducer,
  type AgentProgress,
  type ProcessingState,
} from "@/components/processing/processingState";
import {
  MAX_JOB_SOCKET_RECONNECT_ATTEMPTS,
  useJobSocket,
  type JobSocketConnection,
  type JobSocketConnectionStatus,
} from "@/hooks/useJobSocket";
import { errorMessage, getDeclaration } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";

const SOCKET_SILENCE_BEFORE_POLLING_MS = 4_000;
const POLLING_INTERVAL_MS = 3_000;
const COMPLETION_REDIRECT_DELAY_MS = 1_500;
const REVIEW_REDIRECT_DELAY_MS = 3_500;

const primaryActionClass =
  "inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30";

const secondaryActionClass =
  "inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30";

const connectionLabels: Record<JobSocketConnectionStatus, string> = {
  idle: "Preparando conexión",
  connecting: "Conectando",
  open: "En vivo",
  reconnecting: "Reconectando",
  closed: "Sin conexión en vivo",
  failed: "Sin conexión en vivo",
};

const connectionStyles: Record<
  JobSocketConnectionStatus,
  { badge: string; dot: string }
> = {
  idle: {
    badge: "bg-slate-100 text-slate-600",
    dot: "bg-slate-400",
  },
  connecting: {
    badge: "bg-indigo-50 text-indigo-700",
    dot: "bg-indigo-500 animate-pulse motion-reduce:animate-none",
  },
  open: {
    badge: "bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
  },
  reconnecting: {
    badge: "bg-amber-50 text-amber-800",
    dot: "bg-amber-500 animate-pulse motion-reduce:animate-none",
  },
  closed: {
    badge: "bg-slate-100 text-slate-600",
    dot: "bg-slate-400",
  },
  failed: {
    badge: "bg-rose-50 text-rose-700",
    dot: "bg-rose-500",
  },
};

type StatusView = {
  tone: ProcessingStatusTone;
  title: string;
  description: string;
  busy: boolean;
};

function readStoredJobId(declarationId: string): string | null {
  try {
    const raw = window.sessionStorage.getItem(`taxfrom.job.${declarationId}`);
    if (!raw) {
      return null;
    }

    const value = raw.trim();
    if (!value) {
      return null;
    }

    // El wizard puede guardar el id como texto plano o como JSON.
    if (value.startsWith("{")) {
      const parsed: unknown = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const candidate = (parsed as Record<string, unknown>).job_id;
        if (typeof candidate === "string" && candidate.trim()) {
          return candidate.trim();
        }
      }
      return null;
    }

    return value;
  } catch {
    return null;
  }
}

function buildStatusView(
  state: ProcessingState,
  runningAgent: AgentProgress | null,
  connectionStatus: JobSocketConnectionStatus,
  isPolling: boolean,
): StatusView {
  if (state.jobStatus === "failed") {
    return {
      tone: "error",
      title: "No pudimos completar el procesamiento",
      description:
        state.error ?? "El procesamiento se detuvo antes de terminar.",
      busy: false,
    };
  }

  if (state.jobStatus === "completed") {
    if (state.summary?.requiresAccountantReview) {
      return {
        tone: "warning",
        title: "Declaración lista con observaciones",
        description:
          "Los agentes terminaron, pero hay puntos que requieren revisión del contador. Te llevaremos al detalle en unos segundos.",
        busy: false,
      };
    }

    return {
      tone: "success",
      title: "Tu declaración está lista",
      description:
        "Los seis agentes terminaron correctamente. Te llevaremos al detalle en unos segundos.",
      busy: false,
    };
  }

  if (connectionStatus === "idle" || connectionStatus === "connecting") {
    return {
      tone: "info",
      title: "Conectando con el procesamiento",
      description:
        "Estamos abriendo el canal en tiempo real con el equipo de agentes.",
      busy: true,
    };
  }

  if (
    (connectionStatus === "failed" || connectionStatus === "closed") &&
    isPolling &&
    !runningAgent
  ) {
    return {
      tone: "info",
      title: "Consultando el estado de tu declaración",
      description:
        "La conexión en vivo no está disponible. Verificamos el avance cada 3 segundos.",
      busy: true,
    };
  }

  if (state.jobStatus === "queued") {
    return {
      tone: "info",
      title: "Tu declaración está en cola",
      description:
        "En breve comenzará el procesamiento de tus documentos.",
      busy: true,
    };
  }

  if (runningAgent) {
    const step = Math.min(
      Math.max(state.currentStep, 1),
      state.totalSteps,
    );
    return {
      tone: "info",
      title: `Paso ${step} de ${state.totalSteps}: ${runningAgent.label}`,
      description: runningAgent.message ?? runningAgent.description,
      busy: true,
    };
  }

  const reviewCount = state.agents.filter(
    (agent) => agent.status === "review",
  ).length;

  if (reviewCount > 0) {
    return {
      tone: "warning",
      title: "Hay pasos que requieren revisión",
      description:
        "El procesamiento continúa. Al finalizar, el contador podrá revisar las observaciones encontradas.",
      busy: true,
    };
  }

  return {
    tone: "info",
    title: "Procesando tu declaración",
    description:
      "Los agentes están trabajando en tus documentos. El avance se actualizará automáticamente.",
    busy: true,
  };
}

function buildConnectionFootnote(
  state: ProcessingState,
  connection: JobSocketConnection,
  isPolling: boolean,
  pollError: string | null,
): string | null {
  if (state.jobStatus === "completed" || state.jobStatus === "failed") {
    return null;
  }

  if (state.socketNotice) {
    return state.socketNotice;
  }

  if (connection.status === "reconnecting") {
    return `Reconectando la conexión en vivo (intento ${connection.attempts} de ${MAX_JOB_SOCKET_RECONNECT_ATTEMPTS}).`;
  }

  if (connection.lastError) {
    return connection.lastError;
  }

  if (isPolling) {
    if (pollError) {
      return `No pudimos consultar el estado: ${pollError}. Reintentaremos en 3 segundos.`;
    }
    return "Sin eventos recientes de la conexión en vivo; consultamos el estado cada 3 segundos.";
  }

  return null;
}

export default function ProcessingPage() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <ProcessingRoute />
    </Suspense>
  );
}

function ProcessingRoute() {
  const params = useParams<{ id: string | string[] }>();
  const rawId = params?.id;
  const declarationId = Array.isArray(rawId) ? rawId[0] ?? "" : rawId ?? "";

  return <ProcessingScreen key={declarationId} declarationId={declarationId} />;
}

function ProcessingScreen({ declarationId }: { declarationId: string }) {
  const router = useRouter();
  const { accessToken, authorized, ready } = useRequireAuth();
  const [state, dispatch] = useReducer(
    processingReducer,
    undefined,
    createInitialProcessingState,
  );
  const [jobId, setJobId] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [pollError, setPollError] = useState<string | null>(null);
  const navigatingRef = useRef(false);

  useEffect(() => {
    if (!declarationId) {
      return;
    }

    let cancelled = false;
    // Microtask: sessionStorage es un sistema externo y así evitamos actualizar
    // estado de forma síncrona dentro del efecto.
    void Promise.resolve().then(() => {
      if (cancelled) {
        return;
      }
      // El id del trabajo puede diferir del id de la declaración. Si el wizard
      // no dejó el job en sessionStorage, el id de la URL sirve de respaldo.
      setJobId(readStoredJobId(declarationId) ?? declarationId);
    });

    return () => {
      cancelled = true;
    };
  }, [declarationId]);

  const isProcessing =
    ready &&
    authorized &&
    (state.jobStatus === "queued" || state.jobStatus === "processing");

  const connection = useJobSocket({
    jobId,
    token: accessToken,
    isProcessing,
    dispatch,
  });

  const goToDetail = useCallback(() => {
    if (navigatingRef.current || !declarationId) {
      return;
    }
    navigatingRef.current = true;
    router.replace(`/declarations/${encodeURIComponent(declarationId)}`);
  }, [declarationId, router]);

  const requiresReview =
    state.summary?.requiresAccountantReview === true;

  useEffect(() => {
    if (
      state.jobStatus !== "completed" ||
      !declarationId ||
      !ready ||
      !authorized
    ) {
      return;
    }

    const delay = requiresReview
      ? REVIEW_REDIRECT_DELAY_MS
      : COMPLETION_REDIRECT_DELAY_MS;
    const timer = setTimeout(goToDetail, delay);

    return () => clearTimeout(timer);
  }, [
    authorized,
    declarationId,
    goToDetail,
    ready,
    requiresReview,
    state.jobStatus,
  ]);

  // Respaldo cuando el WebSocket falla o deja de enviar eventos: consulta el
  // detalle de la declaración y navega en cuanto deja el estado inicial.
  useEffect(() => {
    if (!ready || !authorized || !accessToken || !jobId || !declarationId) {
      return;
    }
    if (state.jobStatus === "completed" || state.jobStatus === "failed") {
      return;
    }

    const token = accessToken;
    const currentDeclarationId = declarationId;
    let cancelled = false;
    let started = false;
    let inFlight = false;
    let failures = 0;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let graceTimer: ReturnType<typeof setTimeout> | null = null;
    let resetTimer: ReturnType<typeof setTimeout> | null = null;

    const stopPolling = () => {
      started = false;
      setIsPolling(false);
      if (pollTimer !== null) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      if (graceTimer !== null) {
        clearTimeout(graceTimer);
        graceTimer = null;
      }
    };

    const checkDeclaration = async () => {
      if (cancelled || inFlight) {
        return;
      }

      inFlight = true;
      try {
        const declaration = await getDeclaration(token, currentDeclarationId);
        if (cancelled) {
          return;
        }

        failures = 0;
        setPollError(null);

        const status = declaration.status.toLowerCase();
        const leftInitialState = status !== "draft" && status !== "queued";
        const hasFormValues =
          Array.isArray(declaration.form_values) &&
          declaration.form_values.length > 0;

        if (leftInitialState || hasFormValues) {
          stopPolling();
          goToDetail();
        }
      } catch (cause: unknown) {
        if (cancelled) {
          return;
        }
        failures += 1;
        if (failures >= 2) {
          setPollError(errorMessage(cause));
        }
      } finally {
        inFlight = false;
      }
    };

    const startPolling = () => {
      if (cancelled || started) {
        return;
      }
      started = true;
      setIsPolling(true);
      void checkDeclaration();
      pollTimer = setInterval(() => {
        void checkDeclaration();
      }, POLLING_INTERVAL_MS);
    };

    let delay = 0;
    if (connection.status === "open") {
      delay =
        connection.lastMessageAt === null
          ? SOCKET_SILENCE_BEFORE_POLLING_MS
          : Math.max(
              0,
              SOCKET_SILENCE_BEFORE_POLLING_MS -
                (Date.now() - connection.lastMessageAt),
            );
    } else if (
      connection.status === "connecting" ||
      connection.status === "idle"
    ) {
      delay = SOCKET_SILENCE_BEFORE_POLLING_MS;
    }

    // El reinicio del indicador se hace en un callback para no actualizar
    // estado de forma síncrona dentro del efecto.
    resetTimer = setTimeout(() => {
      resetTimer = null;
      if (cancelled) {
        return;
      }
      setIsPolling(false);
      setPollError(null);
      if (delay === 0) {
        startPolling();
      }
    }, 0);

    if (delay > 0) {
      graceTimer = setTimeout(startPolling, delay);
    }

    return () => {
      cancelled = true;
      if (resetTimer !== null) {
        clearTimeout(resetTimer);
      }
      if (graceTimer !== null) {
        clearTimeout(graceTimer);
      }
      if (pollTimer !== null) {
        clearInterval(pollTimer);
      }
    };
  }, [
    accessToken,
    authorized,
    connection.lastMessageAt,
    connection.status,
    declarationId,
    goToDetail,
    jobId,
    ready,
    state.jobStatus,
  ]);

  if (!ready || !authorized) {
    return <AuthLoading />;
  }

  if (!declarationId) {
    return (
      <AppShell>
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
          <h1 className="text-xl font-bold text-slate-900">
            No encontramos la declaración
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            El enlace no incluye un identificador de declaración válido.
          </p>
          <Link
            href="/dashboard"
            className={`mt-5 ${primaryActionClass}`}
          >
            Volver al dashboard
          </Link>
        </div>
      </AppShell>
    );
  }

  const runningAgent = getRunningAgent(state);
  const progress = getProcessingProgress(state);
  const completedAgents = countCompletedAgents(state);
  const statusView = buildStatusView(
    state,
    runningAgent,
    connection.status,
    isPolling,
  );
  const connectionFootnote = buildConnectionFootnote(
    state,
    connection,
    isPolling,
    pollError,
  );
  const stepNumber = Math.min(
    Math.max(state.currentStep, 1),
    state.totalSteps,
  );
  const stepLabel =
    state.jobStatus === "queued"
      ? "En cola"
      : state.jobStatus === "completed"
        ? "Completado"
        : state.jobStatus === "failed"
          ? "Interrumpido"
          : `Paso ${stepNumber} de ${state.totalSteps}`;
  const pageTitle =
    state.jobStatus === "completed"
      ? "Tu declaración está lista"
      : state.jobStatus === "failed"
        ? "El procesamiento se detuvo"
        : "Estamos preparando tu declaración";
  const pageDescription =
    state.jobStatus === "failed"
      ? "El pipeline se interrumpió antes de terminar. Revisa el detalle y vuelve a intentarlo."
      : state.jobStatus === "completed"
        ? "El equipo de agentes terminó de procesar tus documentos y ya puedes consultar los resultados."
        : "Seis agentes revisan tus documentos, aplican las reglas tributarias y diligencian el Formulario 210.";
  const connectionStyle =
    state.jobStatus === "completed"
      ? {
          badge: "bg-emerald-50 text-emerald-700",
          dot: "bg-emerald-500",
        }
      : state.jobStatus === "failed"
        ? { badge: "bg-rose-50 text-rose-700", dot: "bg-rose-500" }
        : connectionStyles[connection.status];
  const connectionLabel =
    state.jobStatus === "completed"
      ? "Procesamiento finalizado"
      : state.jobStatus === "failed"
        ? "Procesamiento detenido"
        : (connection.status === "failed" ||
              connection.status === "closed") &&
            isPolling
          ? "Consulta periódica"
          : connectionLabels[connection.status];
  const resultsHref = `/declarations/${encodeURIComponent(declarationId)}`;

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-lg px-1 py-1 text-sm font-semibold text-slate-600 transition hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30"
          >
            <span aria-hidden="true">←</span>
            Volver al dashboard
          </Link>

          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${connectionStyle.badge}`}
          >
            <span
              aria-hidden="true"
              className={`size-2 rounded-full ${connectionStyle.dot}`}
            />
            {connectionLabel}
          </span>
        </div>

        <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-700 via-indigo-600 to-indigo-500 p-6 text-white shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200">
                Procesamiento en tiempo real
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                {pageTitle}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100">
                {pageDescription}
                {state.summary?.taxYear
                  ? ` Año gravable ${state.summary.taxYear}.`
                  : ""}
              </p>
            </div>

            <div className="shrink-0 rounded-xl bg-white/10 px-4 py-3 ring-1 ring-inset ring-white/20">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-100">
                Paso actual
              </p>
              <p className="mt-1 text-lg font-bold tabular-nums">
                {stepLabel}
              </p>
              <p className="mt-0.5 text-xs text-indigo-100">
                {completedAgents} de {state.totalSteps} agentes
              </p>
            </div>
          </div>
        </section>

        <ProcessingStatus
          tone={statusView.tone}
          title={statusView.title}
          description={statusView.description}
          footnote={connectionFootnote}
          busy={statusView.busy}
        />

        <section
          aria-labelledby="progress-title"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2
                id="progress-title"
                className="text-base font-bold text-slate-900"
              >
                Progreso general
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {completedAgents} de {state.totalSteps} agentes completados
              </p>
            </div>
            <p className="text-2xl font-bold tabular-nums text-indigo-700">
              {progress}%
            </p>
          </div>

          <div className="mt-4">
            <ProgressBar
              value={progress}
              label="Progreso del procesamiento de la declaración"
            />
          </div>

          <p className="mt-3 text-xs font-medium text-slate-500">
            {stepLabel}
            {runningAgent ? ` · ${runningAgent.label}` : ""}
          </p>
        </section>

        <section
          aria-labelledby="agents-title"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2
                id="agents-title"
                className="text-base font-bold text-slate-900"
              >
                Agentes del pipeline
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Cada agente valida una parte del proceso antes de entregar el
                resultado final.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold tabular-nums text-slate-600">
              {completedAgents} / {state.totalSteps}
            </span>
          </div>

          <div className="mt-6">
            <AgentTimeline agents={state.agents} />
          </div>
        </section>

        {state.jobStatus === "completed" && requiresReview ? (
          <section
            aria-labelledby="review-title"
            className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm sm:p-6"
          >
            <div className="flex gap-3">
              <span
                aria-hidden="true"
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-black text-amber-800"
              >
                !
              </span>
              <div>
                <h2
                  id="review-title"
                  className="text-base font-bold text-amber-950"
                >
                  Revisión del contador recomendada
                </h2>
                <p className="mt-1 text-sm leading-6 text-amber-900">
                  El procesamiento terminó con observaciones. Un contador puede
                  revisarlas y ajustar los valores antes de presentar la
                  declaración.
                </p>
                {state.summary && state.summary.reviewReasons.length > 0 ? (
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-amber-900">
                    {state.summary.reviewReasons.map((reason, index) => (
                      <li key={`${index}-${reason}`}>{reason}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        {state.jobStatus === "completed" ? (
          <section
            aria-labelledby="results-title"
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2
                  id="results-title"
                  className="text-base font-bold text-slate-900"
                >
                  Resultados disponibles
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Abre el detalle para revisar los valores y las observaciones
                  de tu declaración.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Link href={resultsHref} className={primaryActionClass}>
                  Ver resultados
                </Link>
                <Link href="/dashboard" className={secondaryActionClass}>
                  Ir al dashboard
                </Link>
              </div>
            </div>
          </section>
        ) : null}

        {state.jobStatus === "failed" ? (
          <section
            aria-labelledby="failed-title"
            className="rounded-2xl border border-rose-200 bg-white p-5 shadow-sm sm:p-6"
          >
            <h2
              id="failed-title"
              className="text-base font-bold text-rose-950"
            >
              ¿Qué puedes hacer?
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Reintenta el procesamiento con los mismos documentos. Si el error
              continúa, vuelve al dashboard y revisa tu declaración más tarde.
            </p>
            <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm leading-6 text-rose-800">
              {state.error ?? "El procesamiento no pudo completarse."}
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className={primaryActionClass}
              >
                Reintentar
              </button>
              <Link href="/dashboard" className={secondaryActionClass}>
                Volver al dashboard
              </Link>
            </div>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}
