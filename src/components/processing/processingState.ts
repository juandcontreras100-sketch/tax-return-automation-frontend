import type { AgentStatus } from "@/components/ui/AgentBadge";
import type { JobSocketAction, JobSocketEvent } from "@/hooks/useJobSocket";

export const PROCESSING_AGENTS = [
  {
    name: "DocumentIntakeAgent",
    label: "Recepción de documentos",
    description:
      "Clasifica los documentos cargados y verifica que la información base esté completa.",
  },
  {
    name: "VisionExtractionAgent",
    label: "Extracción con visión",
    description:
      "Lee certificados y soportes para extraer ingresos, retenciones y demás valores.",
  },
  {
    name: "CedularClassificationAgent",
    label: "Clasificación cedular",
    description:
      "Organiza los ingresos, costos y deducciones según la cédula correspondiente.",
  },
  {
    name: "TaxRulesAgent",
    label: "Reglas tributarias",
    description:
      "Aplica las reglas y límites del año gravable para calcular el impuesto.",
  },
  {
    name: "ComplianceAuditAgent",
    label: "Auditoría de cumplimiento",
    description:
      "Revisa la consistencia de los datos y detecta riesgos antes de generar el formulario.",
  },
  {
    name: "DianForm210MappingAgent",
    label: "Mapeo Formulario 210",
    description:
      "Ubica cada resultado en las casillas del Formulario 210 listo para revisión.",
  },
] as const;

export type ProcessingAgentName = (typeof PROCESSING_AGENTS)[number]["name"];

export type AgentProgress = {
  name: ProcessingAgentName;
  label: string;
  description: string;
  status: AgentStatus;
  message: string | null;
};

export type JobSummary = {
  requiresAccountantReview: boolean;
  reviewReasons: string[];
  taxYear: number | null;
};

export type JobStatus = "queued" | "processing" | "completed" | "failed";

export type ProcessingState = {
  agents: AgentProgress[];
  jobStatus: JobStatus;
  currentStep: number;
  totalSteps: number;
  summary: JobSummary | null;
  error: string | null;
  socketNotice: string | null;
};

export function createInitialProcessingState(): ProcessingState {
  return {
    agents: PROCESSING_AGENTS.map<AgentProgress>((agent) => ({
      ...agent,
      status: "pending",
      message: null,
    })),
    jobStatus: "queued",
    currentStep: 0,
    totalSteps: PROCESSING_AGENTS.length,
    summary: null,
    error: null,
    socketNotice: null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeAgentStatus(value: unknown): AgentStatus {
  switch (value) {
    case "pending":
    case "running":
    case "ready":
    case "review":
    case "error":
      return value;
    default:
      return "pending";
  }
}

function normalizeJobStatus(value: string | null): JobStatus {
  switch (value) {
    case "done":
    case "completed":
      return "completed";
    case "error":
    case "failed":
      return "failed";
    case "processing":
    case "running":
      return "processing";
    default:
      return "queued";
  }
}

function updateAgent(
  agents: AgentProgress[],
  name: string | null,
  status: AgentStatus,
  message: string | null,
): AgentProgress[] {
  if (!name) {
    return agents;
  }

  const index = agents.findIndex((agent) => agent.name === name);
  if (index === -1) {
    return agents;
  }

  const current = agents[index];
  // Cuando el agente pasa a `running`, el backend no envía mensaje: se limpia
  // el mensaje anterior para no mostrar información de un paso ya terminado.
  const nextMessage = message ?? (status === "running" ? null : current.message);

  if (current.status === status && current.message === nextMessage) {
    return agents;
  }

  const next = agents.slice();
  next[index] = { ...current, status, message: nextMessage };
  return next;
}

function deriveStep(agents: AgentProgress[], totalSteps: number): number {
  const runningIndex = agents.findIndex((agent) => agent.status === "running");
  if (runningIndex !== -1) {
    return runningIndex + 1;
  }

  let lastFinished = 0;
  agents.forEach((agent, index) => {
    if (
      agent.status === "ready" ||
      agent.status === "review" ||
      agent.status === "error"
    ) {
      lastFinished = index + 1;
    }
  });

  return Math.min(Math.max(lastFinished, 1), totalSteps);
}

export function parseJobSummary(value: unknown): JobSummary | null {
  if (!isRecord(value)) {
    return null;
  }

  const reviewReasons = Array.isArray(value.review_reasons)
    ? value.review_reasons.filter(
        (reason): reason is string =>
          typeof reason === "string" && reason.trim().length > 0,
      )
    : [];

  return {
    requiresAccountantReview:
      value.requires_accountant_review === true || reviewReasons.length > 0,
    reviewReasons,
    taxYear: readNumber(value.tax_year),
  };
}

function applySnapshot(
  state: ProcessingState,
  event: JobSocketEvent,
): ProcessingState {
  const payload = event.payload;
  const snapshotAgents = Array.isArray(payload.agents) ? payload.agents : [];

  let agents = PROCESSING_AGENTS.map<AgentProgress>((agent) => ({
    ...agent,
    status: "pending",
    message: null,
  }));

  for (const rawAgent of snapshotAgents) {
    if (!isRecord(rawAgent)) {
      continue;
    }
    agents = updateAgent(
      agents,
      readString(rawAgent.name),
      normalizeAgentStatus(rawAgent.status),
      readString(rawAgent.message),
    );
  }

  const jobStatus = normalizeJobStatus(
    readString(payload.status)?.toLowerCase() ?? null,
  );
  const summary =
    jobStatus === "completed"
      ? parseJobSummary(payload.result) ?? state.summary
      : state.summary;
  const error =
    jobStatus === "failed"
      ? readString(payload.error) ??
        "El procesamiento no pudo completarse."
      : null;

  return {
    ...state,
    agents,
    jobStatus,
    currentStep:
      jobStatus === "completed"
        ? state.totalSteps
        : deriveStep(agents, state.totalSteps),
    summary,
    error,
    socketNotice: null,
  };
}

function applyJobEvent(
  state: ProcessingState,
  event: JobSocketEvent,
): ProcessingState {
  // Una vez que el trabajo llega a un estado terminal no debe retroceder por
  // eventos duplicados o mensajes retrasados de una conexión anterior.
  if (state.jobStatus === "completed" || state.jobStatus === "failed") {
    return state;
  }

  switch (event.type) {
    case "snapshot":
      return applySnapshot(state, event);

    case "job.started":
      return {
        ...state,
        jobStatus: "processing",
        currentStep: Math.max(state.currentStep, 1),
        socketNotice: null,
      };

    case "agent.update": {
      const payload = event.payload;
      const step = readNumber(payload.step);
      const totalSteps = readNumber(payload.total_steps);
      const agents = updateAgent(
        state.agents,
        readString(payload.agent_name),
        normalizeAgentStatus(payload.status),
        readString(payload.message),
      );
      const resolvedTotalSteps =
        totalSteps !== null && totalSteps > 0
          ? Math.round(totalSteps)
          : state.totalSteps;
      const currentStep =
        step !== null && step > 0
          ? Math.min(Math.max(Math.round(step), 1), resolvedTotalSteps)
          : deriveStep(agents, resolvedTotalSteps);

      return {
        ...state,
        agents,
        jobStatus: "processing",
        currentStep,
        totalSteps: resolvedTotalSteps,
        socketNotice: null,
      };
    }

    case "job.completed": {
      const summary = parseJobSummary(event.payload.summary) ?? state.summary;
      const agents = state.agents.map<AgentProgress>((agent) =>
        agent.status === "pending" || agent.status === "running"
          ? { ...agent, status: "ready" }
          : agent,
      );

      return {
        ...state,
        agents,
        jobStatus: "completed",
        currentStep: state.totalSteps,
        summary,
        error: null,
        socketNotice: null,
      };
    }

    case "job.failed": {
      const error =
        readString(event.payload.message) ??
        "El procesamiento no pudo completarse.";
      const agents = state.agents.map<AgentProgress>((agent) =>
        agent.status === "running"
          ? { ...agent, status: "error", message: error }
          : agent,
      );

      return {
        ...state,
        agents,
        jobStatus: "failed",
        error,
        socketNotice: null,
      };
    }

    default:
      return state;
  }
}

export function processingReducer(
  state: ProcessingState,
  action: JobSocketAction,
): ProcessingState {
  if (action.type === "SOCKET_ERROR") {
    return { ...state, socketNotice: action.message };
  }

  return applyJobEvent(state, action.event);
}

export function countCompletedAgents(state: ProcessingState): number {
  return state.agents.filter(
    (agent) => agent.status === "ready" || agent.status === "review",
  ).length;
}

export function getRunningAgent(state: ProcessingState): AgentProgress | null {
  return state.agents.find((agent) => agent.status === "running") ?? null;
}

export function getProcessingProgress(state: ProcessingState): number {
  if (state.jobStatus === "completed") {
    return 100;
  }
  if (state.totalSteps <= 0) {
    return 0;
  }

  const finished = countCompletedAgents(state);
  const running = state.agents.some((agent) => agent.status === "running");
  const weighted = Math.min(finished + (running ? 0.4 : 0), state.totalSteps);
  return Math.round((weighted / state.totalSteps) * 100);
}
