/**
 * GamepadController — singleton com UM único RAF loop.
 * Distribui eventos para subscribers com prioridade.
 * Subscriber retorna `true` para consumir o evento.
 */
import { GAMEPAD_BUTTONS, type GamepadButton } from "./gamepad-constants";

type ButtonHandler = () => boolean | void;

interface Subscriber {
  id: number;
  priority: number;
  handlers: Partial<Record<GamepadButton, ButtonHandler>>;
}

let nextId = 0;
const subscribers: Subscriber[] = [];
let rafId: number | null = null;
const prevPressed = new Set<number>();
const holdTimers = new Map<number, ReturnType<typeof setTimeout>>();
const REPEAT_DELAY = 300;
const REPEAT_RATE = 100;

function getActivePad(): Gamepad | null {
  return Array.from(navigator.getGamepads()).find((p) => p !== null) ?? null;
}

function dispatch(btnKey: GamepadButton): void {
  const sorted = [...subscribers].sort((a, b) => b.priority - a.priority);
  for (const sub of sorted) {
    const handler = sub.handlers[btnKey];
    if (!handler) continue;
    const consumed = handler();
    if (consumed === true) break;
  }
}

function fireIndex(idx: number): void {
  const entry = (
    Object.entries(GAMEPAD_BUTTONS) as [GamepadButton, number][]
  ).find(([, v]) => v === idx);
  if (entry) dispatch(entry[0]);
}

function clearRepeat(idx: number): void {
  const t = holdTimers.get(idx);
  if (t !== undefined) {
    clearTimeout(t);
    holdTimers.delete(idx);
  }
}

function scheduleRepeat(idx: number): void {
  const t = setTimeout(() => {
    const interval = setInterval(() => {
      if (!prevPressed.has(idx)) {
        clearInterval(interval);
        return;
      }
      fireIndex(idx);
    }, REPEAT_RATE);
    holdTimers.set(idx, interval as unknown as ReturnType<typeof setTimeout>);
  }, REPEAT_DELAY);
  holdTimers.set(idx, t);
}

function poll(): void {
  const pad = getActivePad();
  if (pad) {
    pad.buttons.forEach((btn, idx) => {
      const was = prevPressed.has(idx);
      if (btn.pressed && !was) {
        prevPressed.add(idx);
        fireIndex(idx);
        scheduleRepeat(idx);
      } else if (!btn.pressed && was) {
        prevPressed.delete(idx);
        clearRepeat(idx);
      }
    });
  } else if (prevPressed.size > 0) {
    prevPressed.clear();
    holdTimers.forEach((t) => clearTimeout(t));
    holdTimers.clear();
  }
  rafId = requestAnimationFrame(poll);
}

function startLoop(): void {
  if (rafId === null) rafId = requestAnimationFrame(poll);
}

function stopLoop(): void {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  holdTimers.forEach((t) => clearTimeout(t));
  holdTimers.clear();
  prevPressed.clear();
}

export function subscribe(
  handlers: Partial<Record<GamepadButton, ButtonHandler>>,
  priority = 0
): number {
  const id = ++nextId;
  subscribers.push({ id, priority, handlers });
  startLoop();
  return id;
}

export function unsubscribe(id: number): void {
  const idx = subscribers.findIndex((s) => s.id === id);
  if (idx !== -1) subscribers.splice(idx, 1);
  if (subscribers.length === 0) stopLoop();
}
