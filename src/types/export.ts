export type ExportResult = { blob: Blob; url: string };
export type ExportState = {
  phase: "idle" | "recording" | "ready" | "error" | "unsupported";
  currentTime: number;
  duration: number;
  url: string | null;
  filename: string;
  error: string | null;
};
