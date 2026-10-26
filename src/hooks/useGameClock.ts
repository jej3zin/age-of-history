import { useEffect } from "react";
/** Advances the simulation on a fixed interval while the gameplay clock is running. */
export function useGameClock(enabled: boolean, speed: number, busy: boolean, onTick: () => void) {
 useEffect(() => { if (!enabled || speed === 0 || busy) return; const timer = window.setInterval(onTick, 2000 / speed); return () => window.clearInterval(timer); }, [enabled, speed, busy, onTick]);
}
