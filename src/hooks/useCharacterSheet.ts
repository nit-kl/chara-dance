import { useEffect, useRef, useState } from "react";
import { validateCharacterSheet } from "../character/validateCharacterSheet";
import { parseCharacterSheet } from "../character/CharacterSheetParser";
import type { CharacterSheetState } from "../types/studio";
import { SAMPLE_CHARACTER } from "../config/sample";

export function useCharacterSheet() {
  const [state, setState] = useState<CharacterSheetState>({
    selectedFile: null, parsedCharacter: null, phase: "idle", error: null,
  });
  const request = useRef(0);
  const pending = useRef<AbortController | null>(null);
  const [sampleVersion, setSampleVersion] = useState(0);
  useEffect(() => () => { request.current++; pending.current?.abort(); }, []);

  async function processFile(file: File, id: number, sample = false) {
    setState({ selectedFile: file, parsedCharacter: null, phase: "validating", error: null });
    try {
      const validation = await validateCharacterSheet(file);
      if (id !== request.current) return;
      if (!validation.ok) {
        setState({ selectedFile: file, parsedCharacter: null, phase: "error", error: validation.message });
        return;
      }
      setState({ selectedFile: file, parsedCharacter: null, phase: "parsing", error: null });
      const parsedCharacter = await parseCharacterSheet(file);
      if (id === request.current) {
        setState({ selectedFile: file, parsedCharacter, phase: "ready", error: null });
        if (sample) setSampleVersion((value) => value + 1);
      }
    } catch {
      if (id === request.current) setState({ selectedFile: file, parsedCharacter: null, phase: "error",
        error: "この画像は読み込めませんでした。2048×2048pxのPNG画像をもう一度選んでください。" });
    }
  }
  async function selectFile(file: File) {
    pending.current?.abort();
    await processFile(file, ++request.current);
  }
  async function selectSample() {
    pending.current?.abort();
    const abort = new AbortController();
    pending.current = abort;
    const id = ++request.current;
    setState({ selectedFile: null, parsedCharacter: null, phase: "fetching", error: null });
    try {
      const response = await fetch(SAMPLE_CHARACTER.path, { signal: abort.signal });
      if (!response.ok) throw new Error("Sample unavailable");
      const blob = await response.blob();
      if (id !== request.current) return;
      await processFile(new File([blob], SAMPLE_CHARACTER.filename, { type: "image/png" }), id, true);
    } catch {
      if (id === request.current) setState({ selectedFile: null, parsedCharacter: null, phase: "error",
        error: "サンプルを読み込めませんでした。もう一度試すか、自分のPNG画像を選んでください。" });
    } finally { if (pending.current === abort) pending.current = null; }
  }
  return { ...state, selectFile, selectSample, sampleVersion };
}
