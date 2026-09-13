import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { CharacterRenderer } from "../character/CharacterRenderer";
import { loadMotion } from "../animation/MotionLoader";
import { MOTIONS } from "../config/motions";
import { BACKGROUNDS } from "../config/backgrounds";
import type { ParsedCharacter } from "../types/character";
import type { PlaybackState } from "../types/motion";
import { RecordingSession, emptyExportState } from "../export/RecordingSession";
import { canExportWebM } from "../export/VideoExporter";

export function useDanceStudio(character: ParsedCharacter | null, host: RefObject<HTMLDivElement | null>, onExportLockChange: (locked: boolean) => void) {
  const sessionRef = useRef<RecordingSession | null>(null);
  const [exportState, setExportState] = useState(emptyExportState);
  useEffect(() => {
    let active = true;
    const session = new RecordingSession((state) => {
      if (active) { setExportState(state); onExportLockChange(state.phase === "recording"); }
    });
    sessionRef.current = session;
    return () => { session.clear(); active = false; sessionRef.current = null; };
  }, [onExportLockChange]);
  const rendererRef = useRef<CharacterRenderer | null>(null);
  const [selectedMotion, setSelectedMotion] = useState(MOTIONS[0]);
  const [background, setBackground] = useState(BACKGROUNDS[0]);
  const [speed, setSpeed] = useState(1);
  const [playbackState, setPlaybackState] = useState<PlaybackState | null>(null);
  const [rendererPhase, setRendererPhase] = useState("idle");
  const [motionPhase, setMotionPhase] = useState("idle");
  const [retry, setRetry] = useState(0);
  const preferences = useRef({ background, speed });
  preferences.current = { background, speed };

  useEffect(() => {
    setPlaybackState(null);
    sessionRef.current?.clear();
    if (!character) { setRendererPhase("idle"); return; }
    let active = true;
    setRendererPhase("loading");
    const renderer = new CharacterRenderer(host.current, character, (state) => {
      if (active) setPlaybackState(state);
    });
    rendererRef.current = renderer;
    void renderer.ready.then(() => {
      if (!active) return;
      renderer.setBackground(preferences.current.background);
      renderer.setSpeed(preferences.current.speed);
      setRendererPhase("ready");
    }).catch(() => { if (active) setRendererPhase("error"); });
    return () => { active = false; sessionRef.current?.clear(); rendererRef.current = null; renderer.destroy(); };
  }, [character, host]);

  useEffect(() => {
    if (!character) { setMotionPhase("idle"); return; }
    const renderer = rendererRef.current!;
    const abort = new AbortController();
    let active = true;
    setMotionPhase("loading");
    void (async () => {
      try { await renderer.ready; } catch { return; }
      if (!active) return;
      renderer.reset();
      try {
        const motion = await loadMotion(selectedMotion.path, abort.signal);
        if (!active) return;
        renderer.setMotion(motion);
        renderer.setSpeed(preferences.current.speed);
        setMotionPhase("ready");
      } catch { if (active) setMotionPhase("error"); }
    })();
    return () => { active = false; abort.abort(); };
  }, [character, selectedMotion, retry]);

  const ready = rendererPhase === "ready" && motionPhase === "ready" && !!character;
  const error = rendererPhase === "error"
    ? "キャラクターを表示できませんでした。ブラウザの描画機能を確認し、画像を再選択してください。"
    : motionPhase === "error" ? "ダンスを読み込めませんでした。再試行するか、別のダンスを選んでください。" : null;

  return {
    exportState, exportSupported: canExportWebM(), locked: exportState.phase === "recording",
    createVideo: () => { if (ready && rendererRef.current) void sessionRef.current?.start(rendererRef.current, background, selectedMotion.id); },
    cancelExport: () => sessionRef.current?.cancel(),
    selectedMotion, background, speed, playbackState, ready, error,
    loading: !!character && !error && !ready,
    loadingMessage: rendererPhase === "loading" ? "キャラクターを組み立てています…" : "ダンスを読み込んでいます…",
    retryMotion: motionPhase === "error" ? () => setRetry((value) => value + 1) : null,
    selectMotion(id: string) {
      if (sessionRef.current?.isRecording) return;
      const option = MOTIONS.find((motion) => motion.id === id);
      if (option && option !== selectedMotion) {
        sessionRef.current?.clear();
        rendererRef.current?.reset(); setMotionPhase("loading"); setSelectedMotion(option);
      }
    },
    selectBackground(id: string) {
      if (sessionRef.current?.isRecording) return;
      const option = BACKGROUNDS.find((item) => item.id === id);
      if (option) { sessionRef.current?.clear(); setBackground(option); rendererRef.current?.setBackground(option); }
    },
    selectSpeed(value: number) { if (!sessionRef.current?.isRecording) { setSpeed(value); rendererRef.current?.setSpeed(value); } },
    play: () => { if (ready && !sessionRef.current?.isRecording) rendererRef.current?.play(); },
    pause: () => { if (ready && !sessionRef.current?.isRecording) rendererRef.current?.pause(); },
    reset: () => { if (ready && !sessionRef.current?.isRecording) rendererRef.current?.reset(); },
  };
}
