import { useEffect, useState } from "react";
import HydraIcon from "@renderer/assets/icons/hydra.svg?react";
import "./splash-screen.scss";

export function SplashScreen({ onFinish }: { onFinish?: () => void }) {
  const [stage, setStage] = useState<
    "initial" | "fading-in" | "holding" | "fading-out" | "finished"
  >("initial");

  useEffect(() => {
    const playIntroSound = () => {
      try {
        const audioCtx = new window.AudioContext();

        const masterGain = audioCtx.createGain();
        masterGain.gain.setValueAtTime(0, audioCtx.currentTime);
        masterGain.gain.linearRampToValueAtTime(
          0.2,
          audioCtx.currentTime + 0.1
        );
        masterGain.gain.exponentialRampToValueAtTime(
          0.001,
          audioCtx.currentTime + 4.5
        );
        masterGain.connect(audioCtx.destination);

        // --- Deep Cinematic Sub Impact ---
        const baseFreq = 55;
        const hitOsc1 = audioCtx.createOscillator();
        hitOsc1.type = "sine";
        hitOsc1.frequency.setValueAtTime(baseFreq, audioCtx.currentTime);

        const hitOsc2 = audioCtx.createOscillator();
        hitOsc2.type = "triangle";
        hitOsc2.frequency.setValueAtTime(baseFreq * 2, audioCtx.currentTime);

        const hitOsc3 = audioCtx.createOscillator();
        hitOsc3.type = "triangle";
        hitOsc3.frequency.setValueAtTime(baseFreq * 3, audioCtx.currentTime);

        const hitFilter = audioCtx.createBiquadFilter();
        hitFilter.type = "lowpass";
        hitFilter.frequency.setValueAtTime(0, audioCtx.currentTime);
        hitFilter.frequency.linearRampToValueAtTime(
          1000,
          audioCtx.currentTime + 0.1
        );
        hitFilter.frequency.exponentialRampToValueAtTime(
          100,
          audioCtx.currentTime + 4.5
        );

        hitOsc1.connect(hitFilter);
        hitOsc2.connect(hitFilter);
        hitOsc3.connect(hitFilter);
        hitFilter.connect(masterGain);

        hitOsc1.start(audioCtx.currentTime);
        hitOsc2.start(audioCtx.currentTime);
        hitOsc3.start(audioCtx.currentTime);
        hitOsc1.stop(audioCtx.currentTime + 4.5);
        hitOsc2.stop(audioCtx.currentTime + 4.5);
        hitOsc3.stop(audioCtx.currentTime + 4.5);

        // --- Shimmering Airy Tail (PlayStation Dust Effect) ---
        const shimmerFrequencies = [2500, 2750, 3100, 3450, 3800];
        const shimmerGain = audioCtx.createGain();
        shimmerGain.gain.setValueAtTime(0, audioCtx.currentTime);
        shimmerGain.gain.linearRampToValueAtTime(
          0.04,
          audioCtx.currentTime + 0.5
        );
        shimmerGain.gain.exponentialRampToValueAtTime(
          0.001,
          audioCtx.currentTime + 3.0
        );
        shimmerGain.connect(masterGain);

        shimmerFrequencies.forEach((freq) => {
          const osc = audioCtx.createOscillator();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(
            freq / 2,
            audioCtx.currentTime + 3.0
          );
          osc.connect(shimmerGain);
          osc.start(audioCtx.currentTime);
          osc.stop(audioCtx.currentTime + 3.0);
        });
      } catch (err) {
        console.error("Failed to play intro sound", err);
      }
    };

    // Stage pipeline
    setTimeout(() => {
      setStage("fading-in");
      playIntroSound();
    }, 100);

    setTimeout(() => {
      setStage("holding");
    }, 1500);

    setTimeout(() => {
      setStage("fading-out");
    }, 3000);

    setTimeout(() => {
      setStage("finished");
      onFinish?.();
    }, 3800);
  }, [onFinish]);

  if (stage === "finished") return null;

  return (
    <div className={`splash-screen splash-screen--${stage}`}>
      <div className="splash-screen__logo-container">
        <HydraIcon className="splash-screen__logo" />
      </div>
      <div className="splash-screen__glass-effect" />
    </div>
  );
}
