"use client";
/* eslint-disable @next/next/no-img-element -- local/data URLs are intentionally decoded by canvas and cached by the PWA */

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, Camera, Check, Clock3, Download, FileText, History, Home, LocateFixed, MapPin, Plus, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import type { AnalyzeResponse, MissingKey, Occurrence, ProgressState } from "@/lib/contracts";
import { listOccurrences, listQueued, saveOccurrence } from "@/lib/db";
import { readAnalyzeResponse } from "@/lib/analyze-response";
import { downloadOccurrences } from "@/lib/export";
import { processImage, splitDataUrl } from "@/lib/image";
import { questionsFor } from "@/lib/questions";
import { findRecurrence } from "@/lib/recurrence";
import { attentionFor, categoryLabel, confidenceLabel, guidanceFor, signLabel } from "@/lib/rules";
import { scenarios, loadScenarioSnapshot, type Scenario } from "@/lib/scenarios";
import { createSeedHistory } from "@/lib/seed";
import { ProximityView } from "@/components/ProximityView";

type Tab = "home" | "register" | "history";
type Flow = "register" | "analyzing" | "understand" | "act";

const progressLabels: Record<ProgressState, string> = {
  registered: "Registrado", reviewed: "Revisado", forwarded: "Encaminhado", in_progress: "Em andamento", resolved: "Resolvido"
};

function subscribeToConnection(onStoreChange: () => void) {
  window.addEventListener("online", onStoreChange);
  window.addEventListener("offline", onStoreChange);
  return () => {
    window.removeEventListener("online", onStoreChange);
    window.removeEventListener("offline", onStoreChange);
  };
}

function localDateTime(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function blankOccurrence(): Occurrence {
  const now = new Date();
  return { id: crypto.randomUUID(), createdAt: now.toISOString(), observedAt: now.toISOString(), report: "", placeDescription: "", localPhotoPresent: false, analysisState: "draft", progress: "registered", answers: {} };
}

async function postAnalysis(item: Occurrence): Promise<AnalyzeResponse> {
  if (!item.photoDataUrl) throw new Error("Inclua uma foto antes de analisar.");
  const image = splitDataUrl(item.photoDataUrl);
  const response = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image, report: item.report }) });
  return readAnalyzeResponse(response);
}

export function FieldApp() {
  const [tab, setTab] = useState<Tab>("home");
  const [flow, setFlow] = useState<Flow>("register");
  const [current, setCurrent] = useState<Occurrence>(() => blankOccurrence());
  const [history, setHistory] = useState<Occurrence[]>([]);
  const online = useSyncExternalStore(subscribeToConnection, () => navigator.onLine, () => true);
  const [scenarioId, setScenarioId] = useState<string>();
  const [message, setMessage] = useState<{ kind: "info" | "error"; text: string }>();
  const [busyPhoto, setBusyPhoto] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const refreshHistory = useCallback(async () => setHistory(await listOccurrences()), []);

  const resumeQueued = useCallback(async () => {
    if (!navigator.onLine) return;
    const queued = await listQueued();
    for (const item of queued) {
      try {
        const response = await postAnalysis({ ...item, analysisState: "analyzing" });
        await saveOccurrence({ ...item, analysisState: "analyzed", analysis: response.analysis, analysisMeta: response.meta, attention: attentionFor(response.analysis, item.answers), error: undefined });
      } catch {
        await saveOccurrence({ ...item, analysisState: "failed", error: "A retomada automática falhou. Use Tentar novamente." });
      }
    }
    await refreshHistory();
  }, [refreshHistory]);

  useEffect(() => {
    const initialize = async () => {
      let items = await listOccurrences();
      if (!items.length) {
        await Promise.all(createSeedHistory().map(saveOccurrence));
        items = await listOccurrences();
      }
      setHistory(items);
    };
    void initialize();
    const onOnline = () => { void resumeQueued(); };
    window.addEventListener("online", onOnline);
    return () => { window.removeEventListener("online", onOnline); };
  }, [resumeQueued]);

  const goTab = (next: Tab) => {
    setTab(next);
    if (next === "register" && saved) { setCurrent(blankOccurrence()); setScenarioId(undefined); setFlow("register"); setSaved(false); }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const updateCurrent = (patch: Partial<Occurrence>) => setCurrent((value) => ({ ...value, ...patch }));

  const choosePhoto = async (file?: Blob) => {
    if (!file) return;
    setBusyPhoto(true); setMessage(undefined);
    try {
      const image = await processImage(file);
      updateCurrent({ photoDataUrl: image.dataUrl, localPhotoPresent: true });
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Não foi possível preparar a foto." });
    } finally { setBusyPhoto(false); }
  };

  const openScenario = async (scenario: Scenario) => {
    goTab("register"); setScenarioId(scenario.id); setMessage(undefined); setBusyPhoto(true); setSaved(false); setFlow("register");
    try {
      const blob = await (await fetch(scenario.image)).blob();
      const image = await processImage(blob);
      const demoCoords: Record<string, { latitude: number; longitude: number }> = {
        "01_queimada": { latitude: -9.971, longitude: -67.810 }, "02_agua_contaminada": { latitude: -9.944, longitude: -67.831 }, "03_descarte_residuos": { latitude: -9.960, longitude: -67.794 }
      };
      const now = new Date();
      setCurrent({ ...blankOccurrence(), report: scenario.report, placeDescription: "Local simulado — Acre", photoDataUrl: image.dataUrl, localPhotoPresent: true, coordinates: demoCoords[scenario.id], observedAt: now.toISOString() });
      setMessage({ kind: "info", text: "Cenário de demonstração: imagem de fonte aberta; relato, localização e contexto são simulados." });
    } catch { setMessage({ kind: "error", text: "Não foi possível abrir o cenário." }); }
    finally { setBusyPhoto(false); }
  };

  const useLocation = () => {
    if (!navigator.geolocation) { setMessage({ kind: "error", text: "Geolocalização não disponível neste navegador." }); return; }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { updateCurrent({ coordinates: { latitude: Number(coords.latitude.toFixed(3)), longitude: Number(coords.longitude.toFixed(3)) } }); setMessage({ kind: "info", text: "Coordenadas arredondadas e salvas apenas neste aparelho. Elas não serão enviadas ao Gemma." }); },
      () => setMessage({ kind: "error", text: "Não foi possível obter a localização. Você pode continuar sem ela." }),
      { enableHighAccuracy: false, timeout: 10_000 }
    );
  };

  const saveDraft = async () => {
    const draft = { ...current, observedAt: current.observedAt || new Date().toISOString(), analysisState: "draft" as const };
    await saveOccurrence(draft); await refreshHistory(); setMessage({ kind: "info", text: "Rascunho salvo neste aparelho." });
  };

  const analyze = async (item = current) => {
    setMessage(undefined);
    if (!item.photoDataUrl || item.report.trim().length < 10) { setMessage({ kind: "error", text: "Inclua uma foto e um relato de pelo menos 10 caracteres." }); return; }
    if (!navigator.onLine) {
      const queued = { ...item, analysisState: "queued" as const, error: undefined };
      setCurrent(queued); await saveOccurrence(queued); await refreshHistory();
      setMessage({ kind: "info", text: "Sem internet: análise colocada na fila. Ela será retomada quando a conexão voltar." });
      return;
    }
    const analyzing = { ...item, analysisState: "analyzing" as const, error: undefined };
    setCurrent(analyzing); setFlow("analyzing"); await saveOccurrence(analyzing);
    try {
      const response = await postAnalysis(analyzing);
      const done = { ...analyzing, analysisState: "analyzed" as const, analysis: response.analysis, analysisMeta: response.meta, answers: {} };
      setCurrent(done); await saveOccurrence(done); setFlow("understand"); await refreshHistory();
    } catch (error) {
      const typed = error as Error & { code?: string };
      if (typed.code === "MISSING_API_KEY" && scenarioId) {
        try {
          const snapshot = await loadScenarioSnapshot(scenarioId);
          const done: Occurrence = { ...analyzing, analysisState: "analyzed", analysis: snapshot.analysis, analysisMeta: { ...snapshot.meta, snapshot: true, scenarioId }, answers: {} };
          setCurrent(done); await saveOccurrence(done); setMessage({ kind: "info", text: "Resultado pré-processado de demonstração. A análise ao vivo ficará disponível após configurar GEMINI_API_KEY na Vercel." }); setFlow("understand"); await refreshHistory(); return;
        } catch { /* report original server state below */ }
      }
      const failed = { ...analyzing, analysisState: "failed" as const, error: typed.message };
      setCurrent(failed); await saveOccurrence(failed); setFlow("register"); setMessage({ kind: "error", text: typed.message }); await refreshHistory();
    }
  };

  const finishQuestions = () => {
    if (!current.analysis) return;
    const required = current.analysis.missingInformation;
    if (required.some((key) => !current.answers[key])) { setMessage({ kind: "error", text: "Responda às perguntas para calcular a orientação local." }); return; }
    const attention = attentionFor(current.analysis, current.answers);
    const next = { ...current, attention };
    setCurrent(next); void saveOccurrence(next); setMessage(undefined); setFlow("act"); window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const finalize = async () => {
    const item = { ...current, progress: "registered" as const, analysisState: "analyzed" as const };
    await saveOccurrence(item); setCurrent(item); setSaved(true); await refreshHistory(); setMessage({ kind: "info", text: "Ocorrência salva neste aparelho." });
  };

  const retryItem = async (item: Occurrence) => { setCurrent(item); setScenarioId(item.analysisMeta?.scenarioId); setTab("register"); await analyze(item); };

  const updateProgress = async (item: Occurrence, progress: ProgressState) => {
    await saveOccurrence({ ...item, progress }); await refreshHistory();
  };

  const recurrence = useMemo(() => current.analysis ? findRecurrence(current, history) : undefined, [current, history]);

  return <div className="app-shell">
    <header className="topbar">
      <button className="brand" onClick={() => goTab("home")} aria-label="Ir para o início"><span className="brand-mark" aria-hidden="true">O</span><span>Omnibioma</span></button>
      <span className={`connection ${online ? "" : "offline"}`} role="status"><span className="connection-dot" />{online ? "Online" : "Modo offline"}</span>
    </header>

    <main className="content">
      {tab === "home" && <HomeView onRegister={() => goTab("register")} onScenario={openScenario} />}
      {tab === "register" && <>
        <div className="flow-head"><div className="stepper" aria-label="Progresso: registrar, entender, agir e salvar">{["register", "understand", "act", "saved"].map((step, index) => <span key={step} className={`step ${index <= ({ register: 0, analyzing: 0, understand: 1, act: 2 }[flow] + (saved ? 1 : 0)) ? "done" : ""}`} />)}</div></div>
        {flow === "register" && <RegisterView current={current} message={message} busyPhoto={busyPhoto} fileRef={fileRef} onPhoto={choosePhoto} onChange={updateCurrent} onLocation={useLocation} onDraft={saveDraft} onAnalyze={() => void analyze()} onReset={() => { setCurrent(blankOccurrence()); setScenarioId(undefined); setMessage(undefined); }} />}
        {flow === "analyzing" && <div className="form-card loading" aria-live="polite"><div className="spinner" /><h2>O Gemma está observando</h2><p className="helper">Uma única análise curta da imagem e do relato. Localização e histórico não são enviados.</p></div>}
        {flow === "understand" && current.analysis && <UnderstandView item={current} message={message} onBack={() => setFlow("register")} onAnswer={(key, answer) => updateCurrent({ answers: { ...current.answers, [key]: answer } })} onContinue={finishQuestions} />}
        {flow === "act" && current.analysis && <ActView item={current} recurrence={recurrence} message={message} saved={saved} onBack={() => setFlow("understand")} onSave={finalize} onHistory={() => goTab("history")} />}
      </>}
      {tab === "history" && <HistoryView items={history} onExport={() => downloadOccurrences(history)} onProgress={updateProgress} onRetry={retryItem} />}
    </main>

    <nav className="bottom-nav" aria-label="Navegação principal">
      <button className={`nav-button ${tab === "home" ? "active" : ""}`} onClick={() => goTab("home")}><Home size={21} /><span>Início</span></button>
      <button className={`nav-button ${tab === "register" ? "active" : ""}`} onClick={() => goTab("register")}><Plus size={22} /><span>Registrar</span></button>
      <button className={`nav-button ${tab === "history" ? "active" : ""}`} onClick={() => goTab("history")}><History size={21} /><span>Histórico</span></button>
    </nav>
  </div>;
}

function HomeView({ onRegister, onScenario }: { onRegister: () => void; onScenario: (scenario: Scenario) => void }) {
  const main = scenarios.filter((item) => !item.confidenceTest);
  const trust = scenarios.filter((item) => item.confidenceTest);
  return <>
    <section className="hero"><p className="eyebrow">Registrar · agir · prevenir</p><h1>Entenda o sinal. Aja com cuidado.</h1><p>Registre uma evidência ambiental, esclareça o que falta e receba uma orientação preliminar com regras transparentes.</p><button className="button button-dark" onClick={onRegister}><Camera size={19} />Registrar ocorrência</button></section>
    <section className="section" aria-labelledby="cases-title"><div className="section-head"><div><p className="eyebrow">Demonstração</p><h2 id="cases-title">Casos em campo</h2></div><p>Toque para experimentar</p></div><div className="scenario-grid">{main.map((scenario) => <button className="scenario-card" key={scenario.id} onClick={() => onScenario(scenario)}><img src={scenario.image} alt="" loading="lazy" decoding="async" /><span className="scenario-copy"><span>{scenario.kicker}</span><strong>{scenario.title}</strong></span></button>)}</div></section>
    <section className="section confidence-panel" aria-labelledby="trust-title"><p className="eyebrow">Segurança primeiro</p><h2 id="trust-title">Testes de confiança</h2><p className="helper">Bons sistemas também sabem dizer “não sei”. Estes casos verificam limites e falsos positivos.</p><div className="trust-row">{trust.map((scenario) => <button className="trust-card" key={scenario.id} onClick={() => onScenario(scenario)}><span>{scenario.kicker}</span><strong>{scenario.title}</strong></button>)}</div></section>
  </>;
}

function RegisterView({ current, message, busyPhoto, fileRef, onPhoto, onChange, onLocation, onDraft, onAnalyze, onReset }: { current: Occurrence; message?: { kind: "info" | "error"; text: string }; busyPhoto: boolean; fileRef: React.RefObject<HTMLInputElement | null>; onPhoto: (file?: Blob) => void; onChange: (patch: Partial<Occurrence>) => void; onLocation: () => void; onDraft: () => void; onAnalyze: () => void; onReset: () => void }) {
  return <section aria-labelledby="register-title"><p className="eyebrow">Etapa 1 de 4 · Registrar</p><h1 id="register-title">O que você encontrou?</h1><p className="helper">Fotografe de um ponto seguro e descreva apenas o que observou.</p>
    {message && <div className={`notice ${message.kind}`} role="status">{message.kind === "error" ? <AlertTriangle size={19} /> : <ShieldCheck size={19} />}<span>{message.text}</span></div>}
    <div className="form-card">
      <label className="field"><span className="field-label">Foto <small>obrigatória</small></span><span className="photo-drop">{current.photoDataUrl ? <img src={current.photoDataUrl} alt="Prévia da evidência preparada" /> : <span className="photo-placeholder"><Camera size={34} /><strong>{busyPhoto ? "Preparando imagem…" : "Fotografar ou escolher"}</strong><span>Até 1600 px e 2 MB; metadados removidos</span></span>}<input ref={fileRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => void onPhoto(event.target.files?.[0])} /></span></label>
      <label className="field"><span className="field-label">Relato <small>{current.report.length}/1200</small></span><textarea value={current.report} minLength={10} maxLength={1200} placeholder="Ex.: vi fumaça densa saindo da vegetação…" onChange={(event) => onChange({ report: event.target.value })} /></label>
      <div className="two-col"><label className="field"><span className="field-label">Data e hora</span><input type="datetime-local" value={localDateTime(new Date(current.observedAt))} onChange={(event) => onChange({ observedAt: new Date(event.target.value).toISOString() })} /></label><label className="field"><span className="field-label">Descrição do local</span><input value={current.placeDescription} maxLength={180} placeholder="Perto da ponte, margem norte…" onChange={(event) => onChange({ placeDescription: event.target.value })} /></label></div>
      <div className="field"><span className="field-label">Localização <small>opcional e só no aparelho</small></span><div className="location-row"><input readOnly aria-label="Coordenadas salvas" placeholder="Nenhuma coordenada salva" value={current.coordinates ? `${current.coordinates.latitude.toFixed(3)}, ${current.coordinates.longitude.toFixed(3)}` : ""} /><button className="button button-secondary" type="button" onClick={onLocation} aria-label="Usar localização atual"><LocateFixed size={20} /></button></div></div>
      <div className="notice"><ShieldCheck size={19} /><span>Classificação preliminar. Não substitui avaliação técnica nem serviço de emergência.</span></div>
      <div className="actions"><button className="button button-ghost" type="button" onClick={current.report || current.photoDataUrl ? onReset : onDraft}>{current.report || current.photoDataUrl ? "Limpar" : "Rascunho"}</button><button className="button button-primary" type="button" disabled={busyPhoto || !current.photoDataUrl || current.report.trim().length < 10} onClick={onAnalyze}>{current.analysisState === "queued" ? <><Clock3 size={19} />Na fila</> : current.analysisState === "failed" ? <><RefreshCw size={19} />Tentar novamente</> : <><Sparkles size={19} />Analisar</>}</button></div>
      {(current.report || current.photoDataUrl) && <button className="button button-ghost button-wide" style={{ marginTop: 10 }} onClick={onDraft}><FileText size={18} />Salvar como rascunho</button>}
    </div>
  </section>;
}

function UnderstandView({ item, message, onBack, onAnswer, onContinue }: { item: Occurrence; message?: { kind: "info" | "error"; text: string }; onBack: () => void; onAnswer: (key: MissingKey, answer: string) => void; onContinue: () => void }) {
  const analysis = item.analysis!;
  const prompts = questionsFor(analysis.missingInformation);
  return <section aria-labelledby="understand-title"><p className="eyebrow">Etapa 2 de 4 · Entender</p><h1 id="understand-title">O que a evidência sugere</h1>
    {message && <div className={`notice ${message.kind}`} role="status"><ShieldCheck size={19} /><span>{message.text}</span></div>}
    <div className="result-card"><div className="chips"><span className="chip">{categoryLabel[analysis.category]}</span><span className="chip">Confiança {confidenceLabel[analysis.confidence]}</span><span className="chip">Imagem {analysis.imageQuality === "good" ? "boa" : analysis.imageQuality === "fair" ? "razoável" : "ruim"}</span></div><p className="analysis-summary">{analysis.summary}</p><h3>Sinais observados</h3><div className="chips">{analysis.observedSigns.map((sign) => <span className="chip" key={`${sign.code}-${sign.source}`}>{signLabel[sign.code] ?? sign.code} · {sign.source === "both" ? "foto e relato" : sign.source === "image" ? "foto" : "relato"}</span>)}</div>{analysis.uncertainties.length > 0 && <><h3>O que ainda é incerto</h3><ul>{analysis.uncertainties.map((text) => <li key={text}>{text}</li>)}</ul></>}<div className="notice"><ShieldCheck size={19} /><span>Esta é uma classificação preliminar. As próximas perguntas usam opções controladas e não fazem nova inferência.</span></div></div>
    {prompts.length ? <div className="section"><h2>Até três perguntas</h2><p className="helper">Suas respostas recalculam o grau de atenção localmente.</p>{prompts.map((question) => <fieldset className="question" key={question.key}><legend>{question.label}</legend><div className="option-grid">{question.options.map((option) => <label className="option" key={option}><input type="radio" name={question.key} checked={item.answers[question.key] === option} onChange={() => onAnswer(question.key, option)} /><span>{option}</span></label>)}</div></fieldset>)}</div> : <div className="notice info"><Check size={19} /><span>A análise não selecionou perguntas adicionais.</span></div>}
    {message?.kind === "error" && <div className="notice error" role="alert"><AlertTriangle size={19} /><span>{message.text}</span></div>}
    <div className="actions"><button className="button button-ghost" onClick={onBack}><ArrowLeft size={18} />Voltar</button><button className="button button-primary" onClick={onContinue}>Ver orientação<ArrowRight size={18} /></button></div>
  </section>;
}

function ActView({ item, recurrence, message, saved, onBack, onSave, onHistory }: { item: Occurrence; recurrence?: ReturnType<typeof findRecurrence>; message?: { kind: "info" | "error"; text: string }; saved: boolean; onBack: () => void; onSave: () => void; onHistory: () => void }) {
  const analysis = item.analysis!; const attention = item.attention ?? attentionFor(analysis, item.answers); const guidance = guidanceFor(analysis.category);
  return <section aria-labelledby="act-title"><p className="eyebrow">Etapa 3 de 4 · Agir</p><h1 id="act-title">Orientação controlada</h1>
    {message && <div className={`notice ${message.kind}`} role="status"><Check size={19} /><span>{message.text}</span></div>}
    <div className={`attention ${attention === "Atenção rápida" ? "rapid" : attention === "Precisamos de mais informações" ? "more" : ""}`}><p className="attention-label">Grau de atenção</p><h2>{attention}</h2></div>
    <div className="guidance-grid"><div className="result-card"><h3>Cuidados agora</h3><ul>{guidance.care.map((item) => <li key={item}>{item}</li>)}</ul></div><div className="result-card"><h3>Serviços que podem orientar</h3><ul>{guidance.services.map((item) => <li key={item}>{item}</li>)}</ul><p className="helper">Sem contatos específicos: confirme o serviço responsável na sua região.</p></div></div>
    {recurrence?.found && <div className="recurrence"><h3>Possível recorrência próxima</h3><p>Encontramos <strong>{recurrence.count} registros anteriores</strong> da mesma categoria em até {recurrence.periodDays} dias e 2 km. O mais próximo está a {recurrence.closestKm?.toFixed(1)} km.</p>{recurrence.recurringSigns.length > 0 && <p className="helper">Sinais recorrentes: {recurrence.recurringSigns.map((code) => signLabel[code] ?? code).join(", ")}.</p>}<p className="helper">Recorrência é um padrão de registros, não uma previsão de desastre.</p></div>}
    <div className="gemma-box"><h3>Como o Gemma ajudou</h3><p>O modelo identificou a categoria, os sinais, as lacunas e gerou o resumo. O grau de atenção, as perguntas, os cuidados e os serviços vieram de regras locais auditáveis.</p><p className="helper">{item.analysisMeta?.snapshot ? "Snapshot pré-processado de demonstração" : `${item.analysisMeta?.model ?? "gemma-4-26b-a4b-it"} · ${item.analysisMeta?.durationMs ?? 0} ms · store:false`}</p></div>
    <div className="notice"><AlertTriangle size={19} /><span>Classificação preliminar. Se houver risco imediato para pessoas, afaste-se e procure o serviço local de emergência.</span></div>
    <div className="actions"><button className="button button-ghost" onClick={onBack}><ArrowLeft size={18} />Revisar</button>{saved ? <button className="button button-secondary" onClick={onHistory}><History size={18} />Ver histórico</button> : <button className="button button-primary" onClick={onSave}><Check size={18} />Salvar ocorrência</button>}</div>
  </section>;
}

function HistoryView({ items, onExport, onProgress, onRetry }: { items: Occurrence[]; onExport: () => void; onProgress: (item: Occurrence, progress: ProgressState) => void; onRetry: (item: Occurrence) => void }) {
  return <section aria-labelledby="history-title"><p className="eyebrow">Memória local</p><h1 id="history-title">Histórico</h1><p className="helper">Registros, fotos e coordenadas ficam neste aparelho. A exportação JSON não inclui imagens.</p><div className="history-tools"><span className="chip">{items.length} registros</span><button className="button button-secondary" disabled={!items.length} onClick={onExport}><Download size={18} />Exportar JSON</button></div><ProximityView items={items} />
    <div className="history-list">{items.length === 0 ? <div className="empty">Ainda não há ocorrências salvas.</div> : items.map((item) => <article className="history-card" key={item.id}><div><h3><span className="status-dot" />{item.analysis ? categoryLabel[item.analysis.category] : "Rascunho sem análise"}</h3><p>{item.report}</p><p><MapPin size={14} style={{ display: "inline", verticalAlign: "-2px" }} /> {item.placeDescription || "Local não informado"} · {new Date(item.observedAt).toLocaleDateString("pt-BR")}</p><div className="chips"><span className="chip">{item.analysisState === "queued" ? "Aguardando conexão" : item.analysisState === "failed" ? "Falha na análise" : item.attention ?? item.analysisState}</span>{item.analysisMeta?.snapshot && <span className="chip">snapshot</span>}</div>{["queued", "failed"].includes(item.analysisState) && <button className="button button-ghost" onClick={() => void onRetry(item)}><RefreshCw size={17} />Tentar novamente</button>}</div><label><span className="sr-only">Andamento da ocorrência</span><select value={item.progress} onChange={(event) => void onProgress(item, event.target.value as ProgressState)}>{Object.entries(progressLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></article>)}</div>
  </section>;
}
