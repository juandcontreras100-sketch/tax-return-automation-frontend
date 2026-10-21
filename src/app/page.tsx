"use client";

import { ChangeEvent, FormEvent, useReducer, useState } from "react";
import AgentBadge, { type AgentStatus } from "@/components/ui/AgentBadge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { type JobSocketEvent, useJobSocket } from "@/hooks/useJobSocket";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8080/api";
const reasons = [
  ["gross_equity_over_4500_uvt", "Tu patrimonio bruto superó el tope legal (aprox. 4.500 UVT)."],
  ["income_over_1400_uvt", "Tus ingresos totales fueron superiores a 1.400 UVT."],
  ["credit_card_over_1400_uvt", "Tus consumos con tarjeta de crédito excedieron 1.400 UVT."],
  ["purchases_over_1400_uvt", "El valor total de tus compras y consumos superó 1.400 UVT."],
  ["bank_deposits_over_1400_uvt", "El valor acumulado de consignaciones bancarias superó 1.400 UVT."],
] as const;
type Step = "login" | "questionnaire" | "upload" | "processing";
type Reason = (typeof reasons)[number][0] | "none";
type User = { id: string; email: string; name: string; taxpayerId: string };
type DocumentCategory = "rut" | "income_certificate" | "bank_statement";
type DocumentSlots = Record<DocumentCategory, File[]>;
type WorkStatus = "idle" | "submitting" | "processing" | "done" | "error";
type Agent = { name: string; label: string; status: AgentStatus; message?: string };
type WorkState = { status: WorkStatus; agents: Agent[]; result: string | null; error: string | null; requiresReview: boolean; reviewReasons: string[] };

const initialAgents: Agent[] = [
  { name: "DocumentIntakeAgent", label: "Recepción de documentos", status: "pending" },
  { name: "VisionExtractionAgent", label: "Extracción de información", status: "pending" },
  { name: "CedularClassificationAgent", label: "Clasificación cedular", status: "pending" },
  { name: "TaxRulesAgent", label: "Reglas tributarias", status: "pending" },
  { name: "ComplianceAuditAgent", label: "Auditoría de cumplimiento", status: "pending" },
  { name: "DianForm210MappingAgent", label: "Mapeo Formulario 210", status: "pending" },
];
const initialWorkState: WorkState = { status: "idle", agents: initialAgents, result: null, error: null, requiresReview: false, reviewReasons: [] };
type WorkAction = { type: "SUBMIT" } | { type: "JOB_EVENT"; event: JobSocketEvent } | { type: "SOCKET_ERROR"; message: string };
const userStorageKey = "taxfrom-value-user";
const emptyDocumentSlots: DocumentSlots = { rut: [], income_certificate: [], bank_statement: [] };

function workReducer(state: WorkState, action: WorkAction): WorkState {
  if (action.type === "SUBMIT") return { ...initialWorkState, status: "submitting", agents: initialAgents.map((agent) => ({ ...agent })) };
  if (action.type === "SOCKET_ERROR") return { ...state, status: "error", error: action.message };
  const { type, payload } = action.event;
  if (type === "snapshot") {
    const updatedAgents = Array.isArray(payload.agents) ? payload.agents as Array<Record<string, unknown>> : [];
    const status = payload.status === "done" || payload.status === "error" || payload.status === "processing" ? payload.status : "submitting";
    return { ...state, status, agents: state.agents.map((agent) => {
      const update = updatedAgents.find((item) => item.name === agent.name);
      return update ? { ...agent, status: update.status as AgentStatus, message: update.message as string | undefined } : agent;
    }), result: payload.result ? JSON.stringify(payload.result, null, 2) : state.result, error: payload.error as string | null ?? state.error };
  }
  if (type === "job.started") return { ...state, status: "processing" };
  if (type === "agent.update") return { ...state, agents: state.agents.map((agent) => agent.name === payload.agent_name ? { ...agent, status: payload.status as AgentStatus, message: payload.message as string | undefined } : agent) };
  if (type === "job.completed") {
    const reviewReasons = Array.isArray(payload.review_reasons) ? payload.review_reasons.filter((reason): reason is string => typeof reason === "string") : [];
    return { ...state, status: "done", result: JSON.stringify(payload.summary, null, 2), requiresReview: Boolean(payload.requires_accountant_review), reviewReasons };
  }
  return { ...state, status: "error", error: (payload.message as string | undefined) ?? "El procesamiento no pudo completarse." };
}

export default function Home() {
  const [savedUser] = useState<User | null>(() => {
    if (typeof window === "undefined") return null;
    try { return JSON.parse(localStorage.getItem(userStorageKey) ?? "null") as User | null; } catch { return null; }
  });
  const [step, setStep] = useState<Step>(() => savedUser ? "questionnaire" : "login");
  const [user, setUser] = useState<User | null>(savedUser);
  const [login, setLogin] = useState(() => ({ email: savedUser?.email ?? "", password: "", name: savedUser?.name ?? "", taxpayerId: savedUser?.taxpayerId ?? "", year: "2026" }));
  const [selectedReasons, setSelectedReasons] = useState<Reason[]>([]);
  const [documents, setDocuments] = useState<DocumentSlots>(emptyDocumentSlots);
  const [jobId, setJobId] = useState<string | null>(null);
  const [wizardError, setWizardError] = useState<string | null>(null);
  const [work, dispatch] = useReducer(workReducer, initialWorkState);
  const isBusy = work.status === "submitting" || work.status === "processing";
  useJobSocket({ jobId, isProcessing: isBusy, dispatch });

  const currentIndex = ["login", "questionnaire", "upload", "processing"].indexOf(step);
  function updateLogin(name: keyof typeof login, value: string) { setLogin((current) => ({ ...current, [name]: value })); }
  function toggleReason(reason: Reason) {
    setSelectedReasons((current) => {
      if (reason === "none") return current.includes("none") ? [] : ["none"];
      const withoutNone = current.filter((item) => item !== "none");
      return withoutNone.includes(reason) ? withoutNone.filter((item) => item !== reason) : [...withoutNone, reason];
    });
  }
  function loginUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!login.email || !login.password || !login.name || !login.taxpayerId) { setWizardError("Completa los datos de acceso y del declarante."); return; }
    const nextUser = { id: `demo:${login.email}`, email: login.email, name: login.name, taxpayerId: login.taxpayerId };
    localStorage.setItem(userStorageKey, JSON.stringify(nextUser));
    setUser(nextUser);
    setWizardError(null);
    setStep("questionnaire");
  }
  function setUploadedFiles(category: DocumentCategory, event: ChangeEvent<HTMLInputElement>) {
    setDocuments((current) => ({ ...current, [category]: Array.from(event.target.files ?? []) }));
  }
  function logout() {
    localStorage.removeItem(userStorageKey);
    sessionStorage.clear();
    setUser(null); setLogin({ email: "", password: "", name: "", taxpayerId: "", year: "2026" });
    setSelectedReasons([]); setDocuments(emptyDocumentSlots); setJobId(null); setWizardError(null); setStep("login");
  }
  async function submitDocuments(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    if (!selectedReasons.length) { setWizardError("Selecciona al menos una respuesta del cuestionario."); setStep("questionnaire"); return; }
    if (!documents.rut.length || !documents.income_certificate.length) { setWizardError("Adjunta el RUT y al menos un certificado de ingresos y retenciones."); return; }
    setWizardError(null); dispatch({ type: "SUBMIT" }); setStep("processing"); setJobId(null);
    const body = new FormData();
    body.append("tax_year", login.year); body.append("taxpayer_id", user.taxpayerId); body.append("taxpayer_name", user.name); body.append("user_id", user.id); body.append("questionnaire", JSON.stringify(selectedReasons));
    (Object.entries(documents) as Array<[DocumentCategory, File[]]>).forEach(([category, files]) => files.forEach((file) => { body.append("files", file); body.append("document_categories", category); }));
    try {
      const response = await fetch(`${apiUrl}/v1/declarations`, { method: "POST", body });
      const data = await response.json() as { job_id?: string; detail?: string };
      if (response.status !== 202 || !data.job_id) throw new Error(data.detail ?? "El backend no aceptó los documentos.");
      setJobId(data.job_id);
    } catch (error) { dispatch({ type: "SOCKET_ERROR", message: error instanceof Error ? error.message : "No fue posible iniciar el procesamiento." }); }
  }

  return <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-900 sm:px-8 lg:px-12"><div className="mx-auto max-w-5xl">
    <header className="mb-8 flex items-start justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-[0.18em] text-indigo-600">Taxfrom value</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Tu declaración, paso a paso.</h1><p className="mt-2 text-slate-600">Preparamos soportes, validamos causales y procesamos tu declaración.</p></div>{step !== "login" && <button className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200" type="button" onClick={logout}>Cerrar sesión</button>}</header>
    <Stepper currentIndex={currentIndex} onBack={(nextStep) => !isBusy && setStep(nextStep)} />
    {wizardError && <p className="mt-6 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{wizardError}</p>}
    <section className="mt-6 transition-opacity duration-300">
      {step === "login" && <LoginStep login={login} onChange={updateLogin} onSubmit={loginUser} />}
      {step === "questionnaire" && <QuestionnaireStep selected={selectedReasons} onToggle={toggleReason} onBack={() => setStep("login")} onNext={() => selectedReasons.length ? setStep("upload") : setWizardError("Selecciona al menos una respuesta.")} />}
      {step === "upload" && <UploadStep documents={documents} selectedReasons={selectedReasons} onFiles={setUploadedFiles} onBack={() => setStep("questionnaire")} onSubmit={submitDocuments} />}
      {step === "processing" && <ProcessingStep jobId={jobId} work={work} />}
    </section>
  </div></main>;
}

function Stepper({ currentIndex, onBack }: { currentIndex: number; onBack: (step: Step) => void }) {
  const steps: Array<[Step, string]> = [["login", "Login"], ["questionnaire", "Cuestionario"], ["upload", "Documentos"], ["processing", "Procesamiento"]];
  return <ol className="grid grid-cols-4 gap-2" aria-label="Progreso del proceso">{steps.map(([step, label], index) => <li key={step}><button type="button" disabled={index > currentIndex} onClick={() => index < currentIndex && onBack(step)} className={`w-full rounded-lg px-2 py-3 text-center text-xs font-semibold transition sm:text-sm ${index === currentIndex ? "bg-indigo-600 text-white" : index < currentIndex ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100" : "bg-slate-100 text-slate-400"}`}><span className="mr-1.5 inline-flex size-5 items-center justify-center rounded-full bg-white/25">{index + 1}</span>{label}</button></li>)}</ol>;
}

function LoginStep({ login, onChange, onSubmit }: { login: { email: string; password: string; name: string; taxpayerId: string; year: string }; onChange: (name: keyof typeof login, value: string) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <Card className="mx-auto max-w-xl"><h2 className="text-xl font-bold">Inicia sesión</h2><p className="mt-2 text-sm text-slate-600">Esta demostración crea una sesión local para continuar con tu declaración.</p><form className="mt-6 space-y-4" onSubmit={onSubmit}><Field label="Correo electrónico" id="email"><Input id="email" type="email" value={login.email} onChange={(event) => onChange("email", event.target.value)} placeholder="tu@correo.com" /></Field><Field label="Contraseña" id="password"><Input id="password" type="password" value={login.password} onChange={(event) => onChange("password", event.target.value)} placeholder="••••••••" /></Field><Field label="Nombre completo" id="name"><Input id="name" value={login.name} onChange={(event) => onChange("name", event.target.value)} placeholder="Nombre del declarante" /></Field><Field label="NIT o documento" id="taxpayerId"><Input id="taxpayerId" value={login.taxpayerId} onChange={(event) => onChange("taxpayerId", event.target.value)} placeholder="1020304050" /></Field><Field label="Año gravable" id="year"><Input id="year" type="number" min="2024" max="2026" value={login.year} onChange={(event) => onChange("year", event.target.value)} /></Field><Button className="w-full" type="submit">Continuar</Button></form></Card>;
}

function QuestionnaireStep({ selected, onToggle, onBack, onNext }: { selected: Reason[]; onToggle: (reason: Reason) => void; onBack: () => void; onNext: () => void }) {
  return <Card><h2 className="text-xl font-bold">Cuestionario DIAN</h2><p className="mt-2 text-sm text-slate-600">Marca las causales que apliquen a tu situación tributaria.</p><div className="mt-6 space-y-3">{reasons.map(([value, label]) => <label className="flex cursor-pointer gap-3 rounded-xl border border-slate-200 p-4 hover:border-indigo-200" key={value}><input className="mt-0.5 size-4 accent-indigo-600" type="checkbox" checked={selected.includes(value)} onChange={() => onToggle(value)} /><span className="text-sm font-medium text-slate-700">{label}</span></label>)}<label className="flex cursor-pointer gap-3 rounded-xl border border-slate-200 p-4 hover:border-indigo-200"><input className="mt-0.5 size-4 accent-indigo-600" type="checkbox" checked={selected.includes("none")} onChange={() => onToggle("none")} /><span className="text-sm font-medium text-slate-700">Ninguna de las anteriores (No declaro).</span></label></div><NavButtons onBack={onBack} onNext={onNext} /></Card>;
}

function UploadStep({ documents, selectedReasons, onFiles, onBack, onSubmit }: { documents: DocumentSlots; selectedReasons: Reason[]; onFiles: (category: DocumentCategory, event: ChangeEvent<HTMLInputElement>) => void; onBack: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const needsExtracts = selectedReasons.some((reason) => ["income_over_1400_uvt", "credit_card_over_1400_uvt", "purchases_over_1400_uvt", "bank_deposits_over_1400_uvt"].includes(reason));
  return <Card><h2 className="text-xl font-bold">Recepción de documentos</h2><p className="mt-2 text-sm text-slate-600">Adjunta documentos PDF en su contenedor correspondiente para validar cada soporte.</p><form className="mt-6 space-y-4" onSubmit={onSubmit}><DocumentSlot category="rut" label="RUT (Registro Único Tributario)" required files={documents.rut} onChange={onFiles} /><DocumentSlot category="income_certificate" label="Certificado de ingresos y retenciones" required files={documents.income_certificate} onChange={onFiles} /><DocumentSlot category="bank_statement" label="Extractos bancarios" optional={!needsExtracts} files={documents.bank_statement} multiple onChange={onFiles} /><NavButtons onBack={onBack} submitLabel="Enviar y procesar" /></form></Card>;
}

function DocumentSlot({ category, files, label, required, optional, multiple, onChange }: { category: DocumentCategory; files: File[]; label: string; required?: boolean; optional?: boolean; multiple?: boolean; onChange: (category: DocumentCategory, event: ChangeEvent<HTMLInputElement>) => void }) {
  return <div className="rounded-xl border border-slate-200 p-4"><label className="flex cursor-pointer items-center justify-between gap-3" htmlFor={category}><span><span className="block text-sm font-semibold text-slate-800">{label} {required && <span className="text-rose-600">*</span>}</span><span className="mt-1 block text-xs text-slate-500">{optional ? "Opcional" : "PDF requerido"}{multiple ? " · puedes adjuntar varios" : ""}</span></span><span className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700">Elegir PDF</span></label><input className="sr-only" id={category} type="file" accept="application/pdf" multiple={multiple} onChange={(event) => onChange(category, event)} />{files.length > 0 && <ul className="mt-3 space-y-1">{files.map((file) => <li className="rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-700" key={`${category}-${file.name}-${file.lastModified}`}>{file.name} · {Math.ceil(file.size / 1024)} KB</li>)}</ul>}</div>;
}

function ProcessingStep({ jobId, work }: { jobId: string | null; work: WorkState }) {
  return <Card aria-live="polite"><div className="flex items-center justify-between gap-4"><div><h2 className="text-xl font-bold">Procesamiento y revisión</h2><p className="mt-1 text-sm text-slate-600">{jobId ? `Trabajo ${jobId.slice(0, 8)}` : "Preparando el trabajo..."}</p></div><StatusLabel status={work.status} /></div>{work.error && <p className="mt-5 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{work.error}</p>}{work.requiresReview && <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><p className="font-bold">Requiere evaluación del contador</p>{work.reviewReasons.length > 0 && <ul className="mt-2 list-disc pl-5">{work.reviewReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>}</div>}<ol className="mt-6 space-y-3">{work.agents.map((agent) => <li className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 px-4 py-3" key={agent.name}><div><p className="text-sm font-semibold text-slate-800">{agent.label}</p>{agent.message && <p className="mt-1 text-xs text-slate-500">{agent.message}</p>}</div><AgentBadge status={agent.status} /></li>)}</ol>{work.result && <pre className="mt-6 overflow-auto rounded-xl bg-slate-900 p-4 text-xs leading-5 text-slate-100">{work.result}</pre>}</Card>;
}

function Field({ children, id, label }: { children: React.ReactNode; id: string; label: string }) { return <label className="block text-sm font-semibold text-slate-700" htmlFor={id}>{label}<span className="mt-2 block">{children}</span></label>; }
function NavButtons({ onBack, onNext, submitLabel }: { onBack: () => void; onNext?: () => void; submitLabel?: string }) { return <div className="mt-6 flex justify-between gap-3"><button className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100" type="button" onClick={onBack}>Atrás</button>{submitLabel ? <Button type="submit">{submitLabel}</Button> : <Button type="button" onClick={onNext}>{"Continuar"}</Button>}</div>; }
function StatusLabel({ status }: { status: WorkStatus }) { const labels: Record<WorkStatus, string> = { idle: "Listo", submitting: "Enviando", processing: "Procesando", done: "Completado", error: "Con error" }; return <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">{labels[status]}</span>; }
