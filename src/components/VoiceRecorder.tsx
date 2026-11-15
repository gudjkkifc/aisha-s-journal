import { useEffect, useRef, useState } from "react";
import { Mic, Square, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { formatDuration, MAX_VOICE_SECONDS, pickAudioMime } from "@/lib/voice";

type Props = { disabled?: boolean; onRecorded: (blob: Blob) => void };

export function VoiceRecorder({ disabled, onRecorded }: Props) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const discardRef = useRef(false);
  const onRecordedRef = useRef(onRecorded);
  onRecordedRef.current = onRecorded;

  function cleanup() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    setRecording(false);
  }

  useEffect(
    () => () => {
      discardRef.current = true;
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      cleanup();
    },
    [],
  );

  async function start() {
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      toast.error("This browser can't record voice notes.");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast.error(
        "Couldn't use the microphone. Allow microphone access, or open the site in its own tab.",
      );
      return;
    }
    const mime = pickAudioMime((t) => MediaRecorder.isTypeSupported(t));
    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    const chunks: Blob[] = [];
    discardRef.current = false;
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: recorder.mimeType || mime || "audio/webm" });
      cleanup();
      if (!discardRef.current && blob.size > 0) onRecordedRef.current(blob);
    };
    streamRef.current = stream;
    recorderRef.current = recorder;
    recorder.start(1000);
    setSeconds(0);
    setRecording(true);
    const startedAt = Date.now();
    timerRef.current = setInterval(() => {
      const s = Math.floor((Date.now() - startedAt) / 1000);
      setSeconds(s);
      if (s >= MAX_VOICE_SECONDS && recorderRef.current?.state === "recording") {
        toast.message("Voice notes can be up to 10 minutes, so we stopped here.");
        recorderRef.current.stop();
      }
    }, 500);
  }

  function stop(discard: boolean) {
    discardRef.current = discard;
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    else cleanup();
  }

  if (!recording) {
    return (
      <Button type="button" variant="soft" onClick={start} disabled={disabled}>
        <Mic /> Record voice note
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-full border border-primary/40 bg-accent px-2 py-1">
      <span className="relative ml-1 flex h-3 w-3">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
      </span>
      <span className="min-w-12 font-mono text-sm tabular-nums text-accent-foreground">
        {formatDuration(seconds)}
      </span>
      <Button type="button" size="sm" variant="hero" onClick={() => stop(false)}>
        <Square className="fill-current" /> Stop
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        aria-label="Discard recording"
        onClick={() => stop(true)}
      >
        <X />
      </Button>
    </div>
  );
}
