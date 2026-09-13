import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CloudUpload,
  Download,
  FileText,
  FileUp,
  Info,
  Layers3,
  Loader2,
  LockKeyhole,
  RotateCcw,
  Sparkles,
  UploadCloud,
  X,
  XCircle,
} from "lucide-react";
import {
  exportStudyKit,
  getJobStatus,
  getResult,
  isMockMode,
  StudyApiError,
  uploadDocument,
  type JobStatus,
  type StudyResult,
} from "@/lib/studyApi";

type Screen = "upload" | "processing" | "results" | "error";
type ErrorState = { title: string; message: string; kind: "network" | "processing" | "upload" | "result" };

const ACCEPTED_FILE_TYPES = ["application/pdf"];
const PROCESSING_COPY = [
  { eyebrow: "Stage 01", title: "Reading your document", detail: "Finding the ideas worth remembering." },
  { eyebrow: "Stage 02", title: "Condensing key points", detail: "Turning dense pages into a clear study path." },
  { eyebrow: "Stage 03", title: "Writing quiz questions", detail: "Building practice prompts from your material." },
];

function getFriendlyError(error: unknown): ErrorState {
  if (error instanceof StudyApiError) {
    if (error.kind === "network") {
      return { title: "The study server is out of reach", message: error.message, kind: "network" };
    }
    if (error.status === 413 || error.status === 422 || error.kind === "upload") {
      return { title: "This document needs a second look", message: error.message, kind: "upload" };
    }
    if (error.kind === "processing") {
      return { title: "We couldn’t finish processing", message: error.message, kind: "processing" };
    }
    return { title: "Your study kit is incomplete", message: error.message, kind: "result" };
  }
  return {
    title: "Something unexpected happened",
    message: "We couldn’t complete that step. Try again — your document is still safe on this screen.",
    kind: "result",
  };
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AppHeader({ screen, onStartOver }: { screen: Screen; onStartOver: () => void }) {
  const steps = ["Upload", "Process", "Study"];
  const activeStep = screen === "upload" || screen === "error" ? 0 : screen === "processing" ? 1 : 2;

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <button className="brand" onClick={onStartOver} aria-label="Studywise home">
          <span className="brand-mark"><Sparkles size={17} strokeWidth={2.4} /></span>
          <span>studywise</span>
        </button>
        <div className="stepper" aria-label={`Step ${activeStep + 1} of ${steps.length}`}>
          {steps.map((step, index) => (
            <div className={`step ${index <= activeStep ? "step-active" : ""}`} key={step}>
              <span className="step-number">{index < activeStep ? <Check size={12} /> : index + 1}</span>
              <span>{step}</span>
              {index < steps.length - 1 && <span className={`step-line ${index < activeStep ? "line-active" : ""}`} />}
            </div>
          ))}
        </div>
        {screen === "results" ? (
          <button className="text-button" onClick={onStartOver}><FileUp size={15} /> New document</button>
        ) : <div className="topbar-note"><LockKeyhole size={13} /> No sign-up required</div>}
      </div>
    </header>
  );
}

function UploadScreen({
  file,
  subject,
  courseLevel,
  fileError,
  isSubmitting,
  onFile,
  onRemove,
  onSubject,
  onCourseLevel,
  onSubmit,
}: {
  file: File | null;
  subject: string;
  courseLevel: string;
  fileError: string;
  isSubmitting: boolean;
  onFile: (file: File | null) => void;
  onRemove: () => void;
  onSubject: (value: string) => void;
  onCourseLevel: (value: string) => void;
  onSubmit: () => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isPersonalizing, setIsPersonalizing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    const nextFile = files?.[0] ?? null;
    if (!nextFile) return;
    onFile(nextFile);
  };

  return (
    <main className="page-shell upload-shell">
      <section className="upload-hero">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> Your next study session, sorted</div>
          <h1>Turn lecture notes into <em>momentum.</em></h1>
          <p className="hero-lede">Upload a document and get a focused set of revision notes plus a practice quiz — made for the way you learn.</p>
          <div className="hero-trust"><span><CheckCircle2 size={15} /> Clearer concepts</span><span><CheckCircle2 size={15} /> Active recall</span><span><CheckCircle2 size={15} /> Your pace</span></div>
        </div>
        <div className="hero-orbit" aria-hidden="true">
          <div className="orbit-ring ring-one" />
          <div className="orbit-ring ring-two" />
          <div className="orbit-card card-back"><Layers3 size={23} /><span>Key ideas</span></div>
          <div className="orbit-card card-front"><span className="mini-check"><Check size={11} /></span><span>Ready to learn</span></div>
          <div className="orbit-core"><BookOpen size={30} strokeWidth={1.7} /></div>
        </div>
      </section>

      <section className="upload-panel" aria-labelledby="upload-title">
        <div className="section-kicker">Start with a document</div>
        <h2 id="upload-title">What are you studying today?</h2>
        <p className="section-subtitle">Drop in your lecture PDF and we’ll shape it into a study kit.</p>

        <div
          className={`dropzone ${isDragging ? "dropzone-dragging" : ""} ${file ? "dropzone-filled" : ""} ${fileError ? "dropzone-error" : ""}`}
          onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
          onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
          onDragLeave={(event) => { event.preventDefault(); setIsDragging(false); }}
          onDrop={(event) => { event.preventDefault(); setIsDragging(false); handleFiles(event.dataTransfer.files); }}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_FILE_TYPES.join(",")}
            className="sr-only"
            onChange={(event) => handleFiles(event.target.files)}
            aria-label="Choose a PDF to upload"
          />
          {file ? (
            <div className="selected-file">
              <div className="file-icon"><FileText size={22} /></div>
              <div className="file-details"><strong>{file.name}</strong><span>{formatBytes(file.size)} · PDF document</span></div>
              <button className="icon-button" onClick={onRemove} aria-label="Remove selected file"><X size={17} /></button>
            </div>
          ) : (
            <>
              <div className="upload-icon"><CloudUpload size={26} strokeWidth={1.7} /></div>
              <div className="dropzone-title">Drag and drop your PDF here</div>
              <div className="dropzone-or"><span /> or <span /></div>
              <button className="browse-button" type="button" onClick={() => inputRef.current?.click()}><UploadCloud size={16} /> Browse files</button>
              <div className="file-hint">PDF supported · Max 20 MB</div>
            </>
          )}
        </div>
        {fileError && <div className="inline-error" role="alert"><CircleAlert size={15} /> {fileError}</div>}

        <div className={`personalize ${isPersonalizing ? "personalize-open" : ""}`}>
          <button className="personalize-toggle" onClick={() => setIsPersonalizing((value) => !value)} aria-expanded={isPersonalizing}>
            <span><span className="personalize-icon"><Sparkles size={15} /></span><span><strong>Personalize</strong><small>Optional — helps us set the right level</small></span></span>
            <ChevronDown size={17} className="chevron" />
          </button>
          {isPersonalizing && (
            <div className="personalize-fields">
              <label>Subject <span>Optional</span><input value={subject} onChange={(event) => onSubject(event.target.value)} placeholder="e.g. Physics, Biology, History" /></label>
              <label>Course level <span>Optional</span><select value={courseLevel} onChange={(event) => onCourseLevel(event.target.value)}><option value="">Choose a level</option><option value="High School">High School</option><option value="Undergrad">Undergrad</option><option value="Postgrad">Postgrad</option></select></label>
            </div>
          )}
        </div>

        <button className="primary-button generate-button" disabled={!file || isSubmitting} onClick={onSubmit}>
          {isSubmitting ? <><Loader2 size={18} className="spin" /> Preparing your study kit…</> : <>Generate notes & quiz <ArrowRight size={18} /></>}
        </button>
        <div className="privacy-note"><LockKeyhole size={13} /> Your document is used only to create this study kit.</div>
      </section>

      <section className="mini-feature-grid" aria-label="Studywise benefits">
        <div><span className="mini-feature-icon mint"><FileText size={17} /></span><div><strong>Revision-ready notes</strong><p>Keep the signal, lose the clutter.</p></div></div>
        <div><span className="mini-feature-icon lilac"><Sparkles size={17} /></span><div><strong>Practice as you go</strong><p>Spot what’s sticking right away.</p></div></div>
        <div><span className="mini-feature-icon peach"><RotateCcw size={17} /></span><div><strong>Retake without friction</strong><p>Build confidence with another round.</p></div></div>
      </section>
    </main>
  );
}

function ProcessingScreen({ fileName, onCancel }: { fileName: string; onCancel: () => void }) {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setStage((current) => (current + 1) % PROCESSING_COPY.length), 2200);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <main className="processing-shell">
      <section className="processing-card" aria-live="polite">
        <div className="processing-symbol"><div className="processing-symbol-inner"><Sparkles size={29} /></div></div>
        <div className="section-kicker">Building your study kit</div>
        <h1>{PROCESSING_COPY[stage].title}<span className="typing-dots">...</span></h1>
        <p>{PROCESSING_COPY[stage].detail}</p>
        <div className="processing-file"><FileText size={17} /><span>{fileName}</span><span className="processing-status"><span className="pulse-dot" /> Processing</span></div>
        <div className="stage-track" aria-label={`Processing ${PROCESSING_COPY[stage].eyebrow}`}>
          {PROCESSING_COPY.map((item, index) => <span key={item.eyebrow} className={index <= stage ? "stage-complete" : ""}><i />{item.eyebrow}</span>)}
        </div>
        <div className="honest-note"><Info size={14} /> This usually takes less than a minute. You can stay on this page while we work.</div>
        <button className="text-button processing-cancel" onClick={onCancel}><ChevronLeft size={15} /> Choose a different document</button>
      </section>
    </main>
  );
}

function NotesPane({ result }: { result: StudyResult }) {
  return (
    <article className="notes-pane">
      <div className="notes-header"><span className="content-label"><FileText size={14} /> Revision notes</span><span className="notes-meta">AI condensed</span></div>
      <h1>{result.notes.title}</h1>
      <p className="notes-summary">{result.notes.summary}</p>
      <div className="notes-rule" />
      <div className="notes-sections">
        {result.notes.sections.map((section, index) => (
          <section className="note-section" key={`${section.heading}-${index}`}>
            <div className="note-section-heading"><span>{String(index + 1).padStart(2, "0")}</span><h2>{section.heading}</h2></div>
            <ul>{section.bullets.map((bullet) => <li key={bullet}><span className="bullet-mark"><Check size={11} /></span><span>{bullet}</span></li>)}</ul>
          </section>
        ))}
      </div>
      <div className="notes-footer"><Sparkles size={14} /><span>Read once, then test yourself on the right.</span></div>
    </article>
  );
}

function QuizPane({ result, onRetake }: { result: StudyResult; onRetake: () => void }) {
  const questions = result.quiz.questions;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const currentQuestion = questions[currentIndex];
  const selectedIndex = answers[currentQuestion.id];
  const hasAnswered = selectedIndex !== undefined;
  const score = useMemo(() => questions.reduce((total, question) => total + (answers[question.id] === question.correct_index ? 1 : 0), 0), [answers, questions]);
  const isLast = currentIndex === questions.length - 1;
  const answeredCount = Object.keys(answers).length;

  const selectAnswer = (optionIndex: number) => {
    if (hasAnswered) return;
    setAnswers((current) => ({ ...current, [currentQuestion.id]: optionIndex }));
  };

  const retake = () => {
    setAnswers({});
    setCurrentIndex(0);
    onRetake();
  };

  return (
    <aside className="quiz-pane" aria-labelledby="quiz-title">
      <div className="quiz-topline"><span className="content-label"><Sparkles size={14} /> Active recall</span><span className="score-pill"><span className="score-dot" /> {score}/{questions.length} correct</span></div>
      <div className="quiz-heading-row"><div><h2 id="quiz-title">Quick check</h2><p>Answer each question to lock it in.</p></div><div className="quiz-count"><strong>{String(currentIndex + 1).padStart(2, "0")}</strong><span>/ {String(questions.length).padStart(2, "0")}</span></div></div>
      <div className="quiz-progress"><span style={{ width: `${((currentIndex + (hasAnswered ? 1 : 0)) / questions.length) * 100}%` }} /></div>
      <div className="question-card" key={currentQuestion.id}>
        <p className="question-text">{currentQuestion.question}</p>
        <div className="options" role="radiogroup" aria-label="Answer options">
          {currentQuestion.options.map((option, optionIndex) => {
            const isSelected = selectedIndex === optionIndex;
            const isCorrect = optionIndex === currentQuestion.correct_index;
            const optionState = hasAnswered ? (isCorrect ? "option-correct" : isSelected ? "option-wrong" : "option-muted") : isSelected ? "option-selected" : "";
            return <button key={option} className={`option ${optionState}`} onClick={() => selectAnswer(optionIndex)} role="radio" aria-checked={isSelected} disabled={hasAnswered}><span className="option-letter">{String.fromCharCode(65 + optionIndex)}</span><span>{option}</span>{hasAnswered && isCorrect && <CheckCircle2 size={17} className="option-result" />}{hasAnswered && isSelected && !isCorrect && <XCircle size={17} className="option-result" />}</button>;
          })}
        </div>
        {hasAnswered && <div className={`answer-feedback ${selectedIndex === currentQuestion.correct_index ? "feedback-correct" : "feedback-wrong"}`}><div className="feedback-icon">{selectedIndex === currentQuestion.correct_index ? <Check size={15} /> : <X size={15} />}</div><div><strong>{selectedIndex === currentQuestion.correct_index ? "That’s right." : "Not quite."}</strong><p>{currentQuestion.explanation}</p></div></div>}
      </div>
      <div className="quiz-actions">
        <button className="secondary-button" disabled={currentIndex === 0} onClick={() => setCurrentIndex((index) => index - 1)}><ChevronLeft size={16} /> Previous</button>
        {isLast && hasAnswered ? <button className="primary-button quiz-next" onClick={retake}><RotateCcw size={16} /> Retake quiz</button> : <button className="primary-button quiz-next" disabled={!hasAnswered} onClick={() => setCurrentIndex((index) => index + 1)}>Next question <ChevronRight size={16} /></button>}
      </div>
      {answeredCount === questions.length && <div className="quiz-complete"><div className="complete-badge"><Check size={16} /></div><div><strong>Round complete</strong><span>You scored {score} out of {questions.length}. {score === questions.length ? "Perfect recall." : "Review the notes and try again."}</span></div></div>}
    </aside>
  );
}

function ResultsScreen({ result, jobId, onStartOver }: { result: StudyResult; jobId: string; onStartOver: () => void }) {
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const exportFile = async (format: "pdf" | "markdown") => {
    setExportOpen(false);
    setExportError("");
    setExporting(true);
    try {
      const exported = await exportStudyKit(jobId, format);
      if (exported.url) {
        window.open(exported.url, "_blank", "noopener,noreferrer");
      } else if (exported.blob) {
        const url = URL.createObjectURL(exported.blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = exported.filename;
        anchor.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      setExportError(getFriendlyError(error).message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <main className="results-shell page-shell">
      <div className="results-intro"><div><div className="eyebrow"><span className="eyebrow-dot" /> Study kit ready</div><h1>Now make it yours.</h1><p>Read the essentials on the left, then check your understanding on the right.</p></div><div className="results-actions"><div className="export-wrap"><button className="secondary-button export-button" onClick={() => setExportOpen((value) => !value)} disabled={exporting}>{exporting ? <Loader2 size={15} className="spin" /> : <Download size={15} />} {exporting ? "Preparing…" : "Export"}<ChevronDown size={14} /></button>{exportOpen && <div className="export-menu"><button onClick={() => exportFile("markdown")}><FileText size={15} /><span><strong>Markdown</strong><small>Lightweight study file</small></span></button><button onClick={() => exportFile("pdf")}><FileText size={15} /><span><strong>PDF</strong><small>Easy to print or share</small></span></button></div>}</div><button className="text-button" onClick={onStartOver}><FileUp size={15} /> New document</button></div></div>
      {exportError && <div className="export-error" role="alert"><CircleAlert size={15} /> {exportError}</div>}
      <div className="results-grid"><NotesPane result={result} /><QuizPane result={result} onRetake={() => undefined} /></div>
      <div className="results-bottom-note"><Sparkles size={14} /> Small, consistent rounds beat one long cram session.</div>
    </main>
  );
}

function ErrorScreen({ error, onTryAgain }: { error: ErrorState; onTryAgain: () => void }) {
  const network = error.kind === "network";
  return <main className="error-shell"><div className="error-card"><div className={`error-symbol ${network ? "error-network" : ""}`}>{network ? <CloudUpload size={28} /> : <CircleAlert size={28} />}</div><div className="section-kicker">{network ? "Connection interrupted" : "A small detour"}</div><h1>{error.title}</h1><p>{error.message}</p><div className="error-actions"><button className="primary-button" onClick={onTryAgain}><RotateCcw size={16} /> Try again</button><button className="text-button" onClick={onTryAgain}>Choose another document</button></div></div></main>;
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [subject, setSubject] = useState("");
  const [courseLevel, setCourseLevel] = useState("");
  const [fileError, setFileError] = useState("");
  const [jobId, setJobId] = useState("");
  const [result, setResult] = useState<StudyResult | null>(null);
  const [error, setError] = useState<ErrorState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateFile = useCallback((nextFile: File | null) => {
    setFileError("");
    if (!nextFile) { setFile(null); return; }
    if (!ACCEPTED_FILE_TYPES.includes(nextFile.type) && !nextFile.name.toLowerCase().endsWith(".pdf")) {
      setFile(null);
      setFileError("That file type isn’t supported yet. Please choose a PDF.");
      return;
    }
    if (nextFile.size > 20 * 1024 * 1024) {
      setFile(null);
      setFileError("That file is too large. Please choose a PDF under 20 MB.");
      return;
    }
    setFile(nextFile);
  }, []);

  const reset = useCallback(() => {
    window.localStorage.removeItem("studywise_job_id");
    setScreen("upload");
    setFile(null);
    setJobId("");
    setResult(null);
    setError(null);
    setFileError("");
    setIsSubmitting(false);
  }, []);

  const processJob = useCallback(async (nextJobId: string) => {
    setScreen("processing");
    setError(null);
    try {
      const status = await getJobStatus(nextJobId);
      if (status.status === "error") throw new StudyApiError(status.message ?? "The document could not be processed.", "processing");
      if (status.status === "done") {
        const nextResult = await getResult(nextJobId);
        setResult(nextResult);
        window.localStorage.removeItem("studywise_job_id");
        setScreen("results");
        return;
      }
      const timer = window.setTimeout(() => void processJob(nextJobId), 2000);
      return () => window.clearTimeout(timer);
    } catch (caught) {
      setError(getFriendlyError(caught));
      setScreen("error");
      window.localStorage.removeItem("studywise_job_id");
    }
  }, []);

  useEffect(() => {
    const savedJobId = window.localStorage.getItem("studywise_job_id");
    if (savedJobId) {
      setJobId(savedJobId);
      void processJob(savedJobId);
    }
  }, [processJob]);

  const handleSubmit = async () => {
    if (!file) return;
    setIsSubmitting(true);
    setFileError("");
    try {
      const upload = await uploadDocument(file, { subject, course_level: courseLevel });
      setJobId(upload.job_id);
      window.localStorage.setItem("studywise_job_id", upload.job_id);
      await processJob(upload.job_id);
    } catch (caught) {
      setError(getFriendlyError(caught));
      setScreen("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const body = screen === "upload" ? <UploadScreen file={file} subject={subject} courseLevel={courseLevel} fileError={fileError} isSubmitting={isSubmitting} onFile={validateFile} onRemove={() => validateFile(null)} onSubject={setSubject} onCourseLevel={setCourseLevel} onSubmit={handleSubmit} />
    : screen === "processing" ? <ProcessingScreen fileName={file?.name ?? "Your uploaded document"} onCancel={reset} />
      : screen === "results" && result ? <ResultsScreen result={result} jobId={jobId} onStartOver={reset} />
        : <ErrorScreen error={error ?? { title: "We hit a snag", message: "Try uploading your document again.", kind: "result" }} onTryAgain={reset} />;

  return <div className="app-frame"><AppHeader screen={screen} onStartOver={reset} />{body}<footer className="site-footer"><span>studywise <span className="footer-dot">·</span> made for better study sessions</span>{isMockMode() && <span className="demo-badge">Demo mode · connect API_BASE for live processing</span>}</footer></div>;
}
