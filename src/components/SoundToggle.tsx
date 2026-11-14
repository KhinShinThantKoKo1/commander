"use client";

import { useEffect, useState } from "react";
import { isSoundEffectsEnabled, playSoundEffect, setSoundEffectsEnabled } from "@/lib/soundEffects";

export default function SoundToggle() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    setEnabled(isSoundEffectsEnabled());
  }, []);

  function toggleSound() {
    const nextEnabled = !enabled;
    setEnabled(nextEnabled);
    setSoundEffectsEnabled(nextEnabled);
    if (nextEnabled) playSoundEffect("select");
  }

  return (
    <button
      type="button"
      className="sound-toggle"
      aria-label={enabled ? "Mute sound effects" : "Enable sound effects"}
      aria-pressed={enabled}
      title={enabled ? "Mute sound effects" : "Enable sound effects"}
      onClick={toggleSound}
    >
      SOUND {enabled ? "ON" : "OFF"}
    </button>
  );
}
