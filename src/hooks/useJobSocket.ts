"use client";

import { useEffect, useRef, useState } from "react";

export type JobSocketEventType =
  | "snapshot"
  | "job.started"
  | "agent.update"
  | "job.completed"
  | "job.failed";

export type JobSocketEvent = {
  type: JobSocketEventType;
  job_id: string;
  seq: number;
  ts: string;
  payload: Record<string, unknown>;
};

export type JobSocketAction =
  | { type: "JOB_EVENT"; event: JobSocketEvent }
  | { type: "SOCKET_ERROR"; message: string; terminal?: boolean };

export type JobSocketConnectionStatus =
  | "idle"
  | "connecting"
  | "open"
  | "reconnecting"
  | "closed"
  | "failed";

export type JobSocketConnection = {
  status: JobSocketConnectionStatus;
  attempts: number;
  lastMessageAt: number | null;
  lastError: string | null;
};

type UseJobSocketOptions = {
  jobId: string | null;
  getTicket: () => Promise<string>;
  isProcessing: boolean;
  dispatch: (action: JobSocketAction) => void;
};

export const MAX_JOB_SOCKET_RECONNECT_ATTEMPTS = 5;
export const JOB_SOCKET_SUBPROTOCOL = "taxfrom.job.v1";

const FALLBACK_WS_BASE_URL = "ws://127.0.0.1:8080/api/v1/ws";

const EVENT_TYPES = new Set<JobSocketEventType>([
  "snapshot",
  "job.started",
  "agent.update",
  "job.completed",
  "job.failed",
]);

const idleConnection: JobSocketConnection = {
  status: "idle",
  attempts: 0,
  lastMessageAt: null,
  lastError: null,
};

/**
 * Normaliza la base del WebSocket para aceptar tanto la URL documentada
 * (`.../api/v1/ws`) como valores antiguos con `/orchestrator/stream` o una
 * URL completa de trabajo. El endpoint real es `/api/v1/ws/jobs/{job_id}`.
 */
function normalizeWsBaseUrl(rawUrl: string): string {
  let base = rawUrl.trim();

  if (base.startsWith("http://")) {
    base = `ws://${base.slice("http://".length)}`;
  } else if (base.startsWith("https://")) {
    base = `wss://${base.slice("https://".length)}`;
  }

  base = base.replace(/\/+$/, "");
  base = base.replace(/\/orchestrator\/stream$/i, "");
  base = base.replace(/\/jobs\/[^/]+$/i, "");
  return base.replace(/\/+$/, "");
}

const configuredWsUrl = process.env.NEXT_PUBLIC_WS_URL?.trim();

export const JOB_SOCKET_BASE_URL = normalizeWsBaseUrl(
  configuredWsUrl || FALLBACK_WS_BASE_URL,
);

export function jobSocketUrl(jobId: string): string {
  return `${JOB_SOCKET_BASE_URL}/jobs/${encodeURIComponent(jobId)}`;
}

function isJobSocketEvent(
  value: unknown,
  expectedJobId: string,
): value is JobSocketEvent {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.type === "string" &&
    EVENT_TYPES.has(candidate.type as JobSocketEventType) &&
    candidate.job_id === expectedJobId &&
    typeof candidate.seq === "number" &&
    typeof candidate.ts === "string" &&
    typeof candidate.payload === "object" &&
    candidate.payload !== null &&
    !Array.isArray(candidate.payload)
  );
}

export function useJobSocket({
  jobId,
  getTicket,
  isProcessing,
  dispatch,
}: UseJobSocketOptions): JobSocketConnection {
  const dispatchRef = useRef(dispatch);
  const processingRef = useRef(isProcessing);
  const getTicketRef = useRef(getTicket);
  const [connection, setConnection] =
    useState<JobSocketConnection>(idleConnection);

  useEffect(() => {
    dispatchRef.current = dispatch;
  }, [dispatch]);

  useEffect(() => {
    processingRef.current = isProcessing;
  }, [isProcessing]);

  useEffect(() => {
    getTicketRef.current = getTicket;
  }, [getTicket]);

  useEffect(() => {
    if (!jobId || !isProcessing) {
      return;
    }

    const currentJobId = jobId;
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let manuallyClosed = false;
    let attempts = 0;
    let connectSequence = 0;

    function scheduleReconnect() {
      if (manuallyClosed || !processingRef.current) {
        return;
      }
      if (reconnectTimer !== null) {
        return;
      }

      if (attempts >= MAX_JOB_SOCKET_RECONNECT_ATTEMPTS) {
        const message =
          "No pudimos restablecer la conexión en vivo. Seguiremos consultando el estado de tu declaración.";
        setConnection((current) => ({
          ...current,
          status: "failed",
          lastError: message,
        }));
        dispatchRef.current({ type: "SOCKET_ERROR", message });
        return;
      }

      const nextAttempt = attempts + 1;
      attempts = nextAttempt;
      const delay = Math.min(1_000 * 2 ** (nextAttempt - 1), 16_000);

      setConnection((current) => ({
        ...current,
        status: "reconnecting",
        attempts: nextAttempt,
      }));

      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        void connect();
      }, delay);
    }

    async function connect() {
      if (manuallyClosed || !processingRef.current) {
        return;
      }

      const sequence = ++connectSequence;
      setConnection((current) =>
        attempts > 0
          ? { ...current, status: "reconnecting" }
          : {
              status: "connecting",
              attempts: 0,
              lastMessageAt: null,
              lastError: null,
            },
      );

      let ticket: string;
      try {
        ticket = await getTicketRef.current();
      } catch {
        if (!manuallyClosed && sequence === connectSequence) {
          scheduleReconnect();
        }
        return;
      }

      if (
        manuallyClosed ||
        sequence !== connectSequence ||
        !processingRef.current
      ) {
        return;
      }

      let nextSocket: WebSocket;
      try {
        nextSocket = new WebSocket(jobSocketUrl(currentJobId), [
          JOB_SOCKET_SUBPROTOCOL,
          ticket,
        ]);
      } catch {
        scheduleReconnect();
        return;
      }

      socket = nextSocket;

      nextSocket.onopen = () => {
        if (manuallyClosed || socket !== nextSocket) {
          nextSocket.close();
          return;
        }

        // Una conexión exitosa reinicia la cuenta de reintentos consecutivos.
        attempts = 0;
        setConnection((current) => ({
          ...current,
          status: "open",
          attempts: 0,
          lastMessageAt: null,
          lastError: null,
        }));
      };

      nextSocket.onmessage = (messageEvent) => {
        if (manuallyClosed || socket !== nextSocket) {
          return;
        }

        if (typeof messageEvent.data !== "string") {
          dispatchRef.current({
            type: "SOCKET_ERROR",
            message: "El backend envió un evento de trabajo no válido.",
          });
          return;
        }

        try {
          const parsed: unknown = JSON.parse(messageEvent.data);
          if (!isJobSocketEvent(parsed, currentJobId)) {
            throw new Error("Contrato de evento inválido");
          }

          setConnection((current) => ({
            ...current,
            lastMessageAt: Date.now(),
            lastError: null,
          }));
          dispatchRef.current({ type: "JOB_EVENT", event: parsed });
        } catch {
          dispatchRef.current({
            type: "SOCKET_ERROR",
            message: "El backend envió un evento de trabajo no válido.",
          });
        }
      };

      nextSocket.onerror = () => {
        if (manuallyClosed || socket !== nextSocket) {
          return;
        }
        // `onclose` decide si corresponde reconectar; aquí solo dejamos rastro.
        setConnection((current) =>
          current.status === "open"
            ? {
                ...current,
                lastError: "La conexión en vivo presentó un error.",
              }
            : current,
        );
      };

      nextSocket.onclose = (closeEvent) => {
        if (socket !== nextSocket) {
          return;
        }
        socket = null;
        if (manuallyClosed) {
          return;
        }

        // 4401/4403: ticket ausente o inválido, o el trabajo es de otro usuario.
        if (closeEvent.code === 4401 || closeEvent.code === 4403) {
          const message =
            "La sesión no autoriza el canal en vivo. Seguiremos consultando el estado.";
          setConnection((current) => ({
            ...current,
            status: "failed",
            lastError: message,
          }));
          dispatchRef.current({
            type: "SOCKET_ERROR",
            message,
            terminal: true,
          });
          return;
        }

        // 4404: el trabajo ya no existe (o expiró). No tiene sentido reintentar.
        if (closeEvent.code === 4404) {
          const message = "El trabajo de procesamiento no existe o ya expiró.";
          setConnection((current) => ({
            ...current,
            status: "failed",
            lastError: message,
          }));
          dispatchRef.current({
            type: "SOCKET_ERROR",
            message,
            terminal: true,
          });
          return;
        }

        if (!processingRef.current) {
          setConnection((current) => ({ ...current, status: "closed" }));
          return;
        }

        scheduleReconnect();
      };
    }

    // Se difiere un microtask para no actualizar estado de forma síncrona
    // dentro del efecto; el ticket se pide justo antes de conectar.
    void Promise.resolve().then(() => {
      if (!manuallyClosed) {
        void connect();
      }
    });

    return () => {
      manuallyClosed = true;
      connectSequence += 1;
      if (reconnectTimer !== null) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      socket?.close();
    };
  }, [isProcessing, jobId]);

  return jobId && isProcessing ? connection : idleConnection;
}
