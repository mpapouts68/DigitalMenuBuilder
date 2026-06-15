let audioContext: AudioContext | null = null;
let repeatTimer: ReturnType<typeof setInterval> | null = null;
let repeatingActive = false;

export function unlockOrderAlarmAudio(): void {
  if (typeof window === "undefined") {
    return;
  }
  const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) {
    return;
  }
  if (!audioContext) {
    audioContext = new AudioContextCtor();
  }
  if (audioContext.state === "suspended") {
    void audioContext.resume();
  }
}

export interface OrderAlarmOptions {
  count?: number;
  frequencyHz?: number;
  durationMs?: number;
  gapMs?: number;
  volume?: number;
}

export async function playOrderAlarm(options: OrderAlarmOptions = {}): Promise<void> {
  unlockOrderAlarmAudio();
  if (!audioContext) {
    return;
  }
  await audioContext.resume();
  if (audioContext.state !== "running") {
    return;
  }

  const count = Math.max(1, Math.min(9, options.count ?? 4));
  const frequencyHz = options.frequencyHz ?? 880;
  const durationMs = options.durationMs ?? 140;
  const gapMs = options.gapMs ?? 200;
  const volume = options.volume ?? 0.22;
  const stepSec = (durationMs + gapMs) / 1000;
  const toneSec = durationMs / 1000;

  for (let index = 0; index < count; index += 1) {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = "square";
    oscillator.frequency.value = frequencyHz;
    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    const startAt = audioContext.currentTime + index * stepSec;
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + toneSec);

    oscillator.start(startAt);
    oscillator.stop(startAt + toneSec + 0.02);
  }
}

const REPEAT_INTERVAL_MS = 2800;

export function startRepeatingOrderAlarm(): void {
  if (typeof window === "undefined" || repeatingActive) {
    return;
  }
  repeatingActive = true;
  void playOrderAlarm();
  repeatTimer = setInterval(() => {
    void playOrderAlarm();
  }, REPEAT_INTERVAL_MS);
}

export function stopRepeatingOrderAlarm(): void {
  repeatingActive = false;
  if (repeatTimer) {
    clearInterval(repeatTimer);
    repeatTimer = null;
  }
}

const STORAGE_KEY = "orders_alarm_enabled";

export function readOrderAlarmEnabled(): boolean {
  if (typeof window === "undefined") {
    return true;
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored !== "0";
}

export function writeOrderAlarmEnabled(enabled: boolean): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
}
