export type SoundEffect =
  | "select"
  | "correct"
  | "incorrect"
  | "alert"
  | "objective"
  | "dayComplete"
  | "launch"
  | "victory"
  | "defeat";

type Note = {
  frequency: number;
  start: number;
  duration: number;
  volume?: number;
  waveform?: OscillatorType;
  slideTo?: number;
};

const SOUND_PREFERENCE_KEY = "launchlab:sound-effects";

const SOUND_SEQUENCES: Record<SoundEffect, readonly Note[]> = {
  select: [{ frequency: 660, start: 0, duration: 0.055, volume: 0.018 }],
  correct: [
    { frequency: 523, start: 0, duration: 0.14, volume: 0.025 },
    { frequency: 659, start: 0.11, duration: 0.16, volume: 0.025 },
    { frequency: 784, start: 0.23, duration: 0.21, volume: 0.025 }
  ],
  incorrect: [{ frequency: 260, start: 0, duration: 0.2, volume: 0.025, waveform: "triangle", slideTo: 175 }],
  alert: [
    { frequency: 440, start: 0, duration: 0.12, volume: 0.022, waveform: "triangle" },
    { frequency: 330, start: 0.17, duration: 0.16, volume: 0.022, waveform: "triangle" }
  ],
  objective: [
    { frequency: 440, start: 0, duration: 0.14, volume: 0.024 },
    { frequency: 587, start: 0.12, duration: 0.15, volume: 0.024 },
    { frequency: 784, start: 0.24, duration: 0.2, volume: 0.024 }
  ],
  dayComplete: [
    { frequency: 392, start: 0, duration: 0.16, volume: 0.025 },
    { frequency: 523, start: 0.13, duration: 0.17, volume: 0.025 },
    { frequency: 659, start: 0.27, duration: 0.22, volume: 0.025 }
  ],
  launch: [
    { frequency: 196, start: 0, duration: 0.22, volume: 0.022, waveform: "triangle" },
    { frequency: 294, start: 0.15, duration: 0.22, volume: 0.022, waveform: "triangle" },
    { frequency: 440, start: 0.3, duration: 0.24, volume: 0.022, waveform: "triangle" },
    { frequency: 587, start: 0.46, duration: 0.3, volume: 0.022, waveform: "triangle" }
  ],
  victory: [
    { frequency: 523, start: 0, duration: 0.18, volume: 0.026 },
    { frequency: 659, start: 0.13, duration: 0.18, volume: 0.026 },
    { frequency: 784, start: 0.26, duration: 0.18, volume: 0.026 },
    { frequency: 1047, start: 0.39, duration: 0.36, volume: 0.026 }
  ],
  defeat: [
    { frequency: 392, start: 0, duration: 0.2, volume: 0.022, waveform: "triangle" },
    { frequency: 294, start: 0.17, duration: 0.2, volume: 0.022, waveform: "triangle" },
    { frequency: 196, start: 0.34, duration: 0.3, volume: 0.022, waveform: "triangle" }
  ]
};

let audioContext: AudioContext | null = null;

export function isSoundEffectsEnabled() {
  return typeof window === "undefined" || window.localStorage.getItem(SOUND_PREFERENCE_KEY) !== "false";
}

export function setSoundEffectsEnabled(enabled: boolean) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(SOUND_PREFERENCE_KEY, String(enabled));
  }
}

export function playSoundEffect(effect: SoundEffect) {
  if (typeof window === "undefined" || !isSoundEffectsEnabled() || typeof window.AudioContext !== "function") return;
  const context = audioContext ??= new window.AudioContext();
  if (context.state === "suspended") {
    void context.resume()
      .then(() => scheduleSound(context, effect))
      .catch((error: unknown) => console.warn("Launch Lab sound effects could not start.", error));
    return;
  }
  if (context.state !== "running") return;
  scheduleSound(context, effect);
}

function scheduleSound(context: AudioContext, effect: SoundEffect) {
  const now = context.currentTime;
  for (const note of SOUND_SEQUENCES[effect]) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const startsAt = now + note.start;
    const endsAt = startsAt + note.duration;
    oscillator.type = note.waveform ?? "sine";
    oscillator.frequency.setValueAtTime(note.frequency, startsAt);
    if (note.slideTo) oscillator.frequency.exponentialRampToValueAtTime(note.slideTo, endsAt);
    gain.gain.setValueAtTime(0.0001, startsAt);
    gain.gain.linearRampToValueAtTime(note.volume ?? 0.022, startsAt + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, endsAt);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startsAt);
    oscillator.stop(endsAt + 0.01);
  }
}
