"use client";

import { useEffect, useRef } from "react";

export type JobSocketEvent = {
  type: "snapshot" | "job.started" | "agent.update" | "job.completed" | "job.failed";
  job_id: string;
  seq: number;
  ts: string;
  payload: Record<string, unknown>;
};

type JobSocketAction = { type: "JOB_EVENT"; event: JobSocketEvent } | { type: "SOCKET_ERROR"; message: string };

type UseJobSocketOptions = {
  jobId: string | null;
  isProcessing: boolean;
  dispatch: (action: JobSocketAction) => void;
};

const maxReconnectAttempts = 5;
const baseWsUrl = (process.env.NEXT_PUBLIC_WS_URL ?? "ws://127.0.0.1:8080/api/v1/ws")
  .replace(/\/orchestrator\/stream\/?$/, "")
  .replace(/\/$/, "");

export function useJobSocket({ jobId, isProcessing, dispatch }: UseJobSocketOptions) {
  const processingRef = useRef(isProcessing);

  useEffect(() => {
    processingRef.current = isProcessing;
  }, [isProcessing]);

  useEffect(() => {
    if (!jobId || !isProcessing) return;

    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let manuallyClosed = false;
    let attempts = 0;

    const connect = () => {
      socket = new WebSocket(`${baseWsUrl}/jobs/${encodeURIComponent(jobId)}`);
      socket.onmessage = ({ data }) => {
        try {
          const event = JSON.parse(data) as JobSocketEvent;
          if (!event.type || event.job_id !== jobId || !event.payload) throw new Error("Contrato de evento inválido");
          dispatch({ type: "JOB_EVENT", event });
        } catch {
          dispatch({ type: "SOCKET_ERROR", message: "El backend envió un evento de trabajo no válido." });
        }
      };
      socket.onclose = () => {
        if (manuallyClosed || !processingRef.current) return;
        if (attempts >= maxReconnectAttempts) {
          dispatch({ type: "SOCKET_ERROR", message: "Se agotaron los intentos de reconexión al progreso del trabajo." });
          return;
        }
        const delay = Math.min(1_000 * 2 ** attempts, 16_000);
        attempts += 1;
        reconnectTimer = setTimeout(connect, delay);
      };
      socket.onerror = () => socket?.close();
    };

    connect();
    return () => {
      manuallyClosed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [dispatch, isProcessing, jobId]);
}
