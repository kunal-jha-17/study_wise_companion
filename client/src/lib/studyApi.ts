export type JobStatus = "processing" | "done" | "error";

export type UploadResponse = {
  job_id: string;
  status: JobStatus;
};

export type StatusResponse = {
  job_id: string;
  status: JobStatus;
  message?: string;
};

export type Notes = {
  title: string;
  summary: string;
  sections: Array<{
    heading: string;
    bullets: string[];
  }>;
};

export type QuizQuestion = {
  id: number;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
};

export type StudyResult = {
  notes: Notes;
  quiz: {
    questions: QuizQuestion[];
  };
};

export type ExportFormat = "pdf" | "markdown";

export class StudyApiError extends Error {
  kind: "network" | "upload" | "processing" | "result" | "export";
  status?: number;

  constructor(
    message: string,
    kind: StudyApiError["kind"],
    status?: number,
  ) {
    super(message);
    this.name = "StudyApiError";
    this.kind = kind;
    this.status = status;
  }
}

const API_BASE = (import.meta.env.VITE_API_BASE ?? "").replace(/\/$/, "");
const MOCK_DELAY = 4200;
let mockStartedAt: number | null = null;

const mockResult: StudyResult = {
  notes: {
    title: "Newton's Laws of Motion",
    summary:
      "Newton’s three laws give us a compact framework for explaining how forces change an object’s motion: inertia describes resistance to change, F = ma connects net force to acceleration, and action–reaction pairs explain interactions between objects.",
    sections: [
      {
        heading: "The core idea",
        bullets: [
          "A force is a push or pull that can change an object’s velocity.",
          "Net force is the vector sum of all forces acting on an object.",
          "Acceleration always points in the same direction as the net force.",
        ],
      },
      {
        heading: "Newton’s three laws",
        bullets: [
          "First law: an object maintains its state of rest or uniform motion unless acted on by a net external force.",
          "Second law: the net force on an object equals its mass multiplied by its acceleration (F = ma).",
          "Third law: when one object exerts a force on another, the second exerts an equal and opposite force on the first.",
        ],
      },
      {
        heading: "How to solve problems",
        bullets: [
          "Draw a free-body diagram and label every force acting on the object of interest.",
          "Choose coordinate axes, resolve forces into components, and calculate the net force.",
          "Use consistent SI units: newtons for force, kilograms for mass, and metres per second squared for acceleration.",
        ],
      },
    ],
  },
  quiz: {
    questions: [
      {
        id: 1,
        question: "Which statement best describes Newton’s first law?",
        options: [
          "Force is always equal to mass divided by acceleration.",
          "An object keeps its motion unless a net external force acts on it.",
          "Every force creates two forces in the same direction.",
          "Heavier objects always accelerate faster.",
        ],
        correct_index: 1,
        explanation:
          "Newton’s first law is the law of inertia: without a net external force, an object’s velocity stays constant.",
      },
      {
        id: 2,
        question: "A 3 kg object accelerates at 4 m/s². What net force acts on it?",
        options: ["0.75 N", "1 N", "7 N", "12 N"],
        correct_index: 3,
        explanation:
          "Using F = ma, the net force is 3 kg × 4 m/s² = 12 N.",
      },
      {
        id: 3,
        question: "What is true about an action–reaction pair?",
        options: [
          "Both forces act on the same object.",
          "The forces are equal, opposite, and act on different objects.",
          "The forces only exist when the objects are moving.",
          "The action force is always larger than the reaction force.",
        ],
        correct_index: 1,
        explanation:
          "Newton’s third-law forces are equal in magnitude, opposite in direction, and act on two different interacting objects.",
      },
      {
        id: 4,
        question: "In a free-body diagram, what should be included?",
        options: [
          "Every object visible in the room",
          "Only the object’s speed",
          "All external forces acting on the chosen object",
          "The final answer before solving",
        ],
        correct_index: 2,
        explanation:
          "A free-body diagram isolates one object and shows the external forces acting on it, each with a direction.",
      },
      {
        id: 5,
        question: "If the net force on an object doubles while its mass stays constant, its acceleration will…",
        options: [
          "Double",
          "Be cut in half",
          "Stay the same",
          "Become zero",
        ],
        correct_index: 0,
        explanation:
          "From a = F/m, acceleration is directly proportional to net force when mass is constant.",
      },
    ],
  },
};

function getErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

async function request(path: string, init: RequestInit, kind: StudyApiError["kind"]) {
  try {
    const response = await fetch(`${API_BASE}${path}`, init);
    const contentType = response.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
      ? await response.json().catch(() => null)
      : null;

    if (!response.ok) {
      if (response.status === 413) {
        throw new StudyApiError(
          "That file is too large to process. Try a smaller PDF or split the document into shorter chapters.",
          "upload",
          response.status,
        );
      }
      if (response.status === 422) {
        throw new StudyApiError(
          "We couldn’t read this PDF. Check that it opens normally and try exporting it again before uploading.",
          "upload",
          response.status,
        );
      }
      throw new StudyApiError(
        getErrorMessage(payload, "Something went wrong. Please try again."),
        kind,
        response.status,
      );
    }

    return { response, payload };
  } catch (error) {
    if (error instanceof StudyApiError) throw error;
    throw new StudyApiError(
      "We couldn’t reach the study server. Check your connection and try again.",
      "network",
    );
  }
}

export function isMockMode() {
  return !API_BASE;
}

export async function uploadDocument(
  file: File,
  personalization: { subject: string; course_level: string },
): Promise<UploadResponse> {
  if (isMockMode()) {
    await new Promise((resolve) => window.setTimeout(resolve, 700));
    mockStartedAt = Date.now();
    return { job_id: `demo-${Date.now()}`, status: "processing" };
  }

  const formData = new FormData();
  formData.append("file", file);
  if (personalization.subject) formData.append("subject", personalization.subject);
  if (personalization.course_level) {
    formData.append("course_level", personalization.course_level);
  }

  const { payload } = await request(
    "/upload",
    { method: "POST", body: formData },
    "upload",
  );

  if (!payload || typeof payload.job_id !== "string" || typeof payload.status !== "string") {
    throw new StudyApiError("The server returned an unexpected upload response.", "upload");
  }
  return payload as UploadResponse;
}

export async function getJobStatus(jobId: string): Promise<StatusResponse> {
  if (isMockMode()) {
    const elapsed = mockStartedAt ? Date.now() - mockStartedAt : MOCK_DELAY;
    return {
      job_id: jobId,
      status: elapsed >= MOCK_DELAY ? "done" : "processing",
    };
  }

  const { payload } = await request(`/status/${encodeURIComponent(jobId)}`, {}, "processing");
  if (!payload || payload.job_id !== jobId || !["processing", "done", "error"].includes(payload.status)) {
    throw new StudyApiError("The server returned an unexpected processing status.", "processing");
  }
  return payload as StatusResponse;
}

export async function getResult(jobId: string): Promise<StudyResult> {
  if (isMockMode()) {
    await new Promise((resolve) => window.setTimeout(resolve, 500));
    return mockResult;
  }

  const { payload } = await request(`/result/${encodeURIComponent(jobId)}`, {}, "result");
  const notes = payload?.notes;
  const questions = payload?.quiz?.questions;
  const validQuestions = Array.isArray(questions) && questions.length > 0 && questions.every((question) => (
    question &&
    typeof question.id === "number" &&
    typeof question.question === "string" &&
    Array.isArray(question.options) &&
    question.options.length > 1 &&
    typeof question.correct_index === "number" &&
    typeof question.explanation === "string"
  ));
  if (
    !notes ||
    typeof notes.title !== "string" ||
    typeof notes.summary !== "string" ||
    !Array.isArray(notes.sections) ||
    !validQuestions
  ) {
    throw new StudyApiError("The study server returned incomplete notes or quiz data.", "result");
  }
  return payload as StudyResult;
}

export async function exportStudyKit(jobId: string, format: ExportFormat) {
  if (isMockMode()) {
    const content = format === "markdown"
      ? `# ${mockResult.notes.title}\n\n${mockResult.notes.summary}\n\n${mockResult.notes.sections.map((section) => `## ${section.heading}\n${section.bullets.map((bullet) => `- ${bullet}`).join("\n")}`).join("\n\n")}`
      : `Studywise export\n\n${mockResult.notes.title}\n\n${mockResult.notes.summary}`;
    const blob = new Blob([content], { type: format === "markdown" ? "text/markdown" : "application/pdf" });
    return { blob, filename: `studywise-notes.${format === "markdown" ? "md" : "pdf"}` };
  }

  const { response, payload } = await request(
    `/export/${encodeURIComponent(jobId)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format }),
    },
    "export",
  );

  if (payload && typeof payload.url === "string") {
    return { url: payload.url, filename: `studywise-notes.${format === "markdown" ? "md" : "pdf"}` };
  }
  const blob = await response.blob();
  return { blob, filename: `studywise-notes.${format === "markdown" ? "md" : "pdf"}` };
}
