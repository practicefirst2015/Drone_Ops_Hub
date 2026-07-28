import { useEffect, useRef, useState } from "react";
import { Mic, Square, Loader2, X, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { toast } from "sonner";

type Status = "idle" | "recording" | "processing";

interface Props {
  /** Called with the AI-proposed field values; the form prefills, user reviews. */
  onFields: (fields: Record<string, any>, transcript: string) => void;
  onClose: () => void;
}

const MAX_SECONDS = 300; // 5 min is plenty for a debrief

function pickMimeType(): string {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(c)) return c;
  }
  return "";
}

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

export function VoiceFlightLogPanel({ onFields, onClose }: Props) {
  const { currentOrg } = useOrg();
  const [status, setStatus] = useState<Status>("idle");
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

  const cleanupStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => cleanupStream, []);

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("This browser can't record audio. Try Chrome or Safari.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => void handleStop(rec.mimeType || mimeType || "audio/webm");
      recorderRef.current = rec;
      rec.start();
      setStatus("recording");
      setSeconds(0);
      setTranscript(null);
      timerRef.current = window.setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_SECONDS) stop();
          return s + 1;
        });
      }, 1000);
    } catch {
      toast.error("Microphone access was blocked. Allow it in your browser settings and try again.");
    }
  };

  const stop = () => {
    if (recorderRef.current?.state === "recording") {
      setStatus("processing");
      recorderRef.current.stop();
    }
  };

  const handleStop = async (mimeType: string) => {
    cleanupStream();
    try {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      if (blob.size < 1000) {
        toast.error("That recording was too short.");
        setStatus("idle");
        return;
      }
      const audio_base64 = await blobToBase64(blob);
      const { data, error } = await supabase.functions.invoke("voice-flight-log", {
        body: { audio_base64, mime_type: mimeType, organization_id: currentOrg?.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setTranscript(data.transcript ?? null);
      if (data.fields) {
        onFields(data.fields, data.transcript ?? "");
        toast.success("Form filled from your recording — please review before saving.");
      } else {
        toast.warning(data.warning || "Transcribed, but couldn't fill the form. Copy from the transcript below.");
      }
      setStatus("idle");
    } catch (err: any) {
      const msg = String(err?.message || "");
      toast.error(
        msg.includes("OPENAI_API_KEY") || msg.includes("not configured")
          ? "Voice input isn't configured yet — an OpenAI API key is needed."
          : msg || "Could not process the recording."
      );
      setStatus("idle");
    }
  };

  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <div className="border border-border bg-muted/30 p-4 mb-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-mono text-xs text-foreground mb-1">Dictate this flight log</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed max-w-lg">
            Say the project, aircraft, times, outcome, what you captured, and anything unusual.
            Everything fills in below for you to check before saving.
          </p>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground" title="Close">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-3">
        {status === "idle" && (
          <button
            type="button"
            onClick={start}
            className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground font-mono text-xs hover:opacity-90 transition-opacity"
          >
            <Mic className="w-3.5 h-3.5" />
            {transcript ? "Record again" : "Start recording"}
          </button>
        )}

        {status === "recording" && (
          <>
            <button
              type="button"
              onClick={stop}
              className="flex items-center gap-2 px-3 py-2 border border-destructive text-destructive font-mono text-xs hover:bg-destructive/10 transition-colors"
            >
              <Square className="w-3.5 h-3.5" />
              Stop
            </button>
            <span className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
              {mmss}
            </span>
          </>
        )}

        {status === "processing" && (
          <span className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Transcribing and filling the form…
          </span>
        )}
      </div>

      {transcript && (
        <div className="mt-3">
          <p className="stat-label mb-1.5 flex items-center gap-1.5">
            <RotateCcw className="w-3 h-3" /> What we heard
          </p>
          <p className="text-[11px] text-muted-foreground leading-relaxed bg-background border border-border p-2.5 max-h-32 overflow-y-auto">
            {transcript}
          </p>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground mt-3">
        Audio is sent for transcription and not stored. Always verify the filled fields — this is an operational record.
      </p>
    </div>
  );
}
