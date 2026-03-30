import { useEffect } from "react";
import { useGamepadConnected, useGamepad } from "./use-gamepad";
import { playBeep } from "@renderer/helpers";

const FOCUSABLE_SELECTOR = [
  "a[href]:not([disabled]):not([tabindex='-1'])",
  "button:not([disabled]):not([tabindex='-1'])",
  "input:not([disabled]):not([tabindex='-1'])",
  "select:not([disabled]):not([tabindex='-1'])",
  "textarea:not([disabled]):not([tabindex='-1'])",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

function isVisible(el: Element): boolean {
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return false;
  const s = window.getComputedStyle(el);
  return s.display !== "none" && s.visibility !== "hidden" && s.opacity !== "0";
}

function isIgnored(el: Element): boolean {
  const ignoredNode = el.closest("[data-gamepad-ignore]");
  if (!ignoredNode) return false;
  return ignoredNode.getAttribute("data-gamepad-ignore") === "true";
}

/**
 * Retorna candidatos focáveis APENAS dentro do <main>.
 * Isso exclui automaticamente header, sidebar, title-bar e bottom-panel.
 */
function getCandidates(): Element[] {
  // 1. Procurar modais abertos primeiro (prioridade máxima)
  const openModal = Array.from(document.querySelectorAll(".modal")).find(
    isVisible
  );
  if (openModal) {
    return Array.from(openModal.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
      (el) => !isIgnored(el) && isVisible(el)
    );
  }

  // 2. Procurar aba de Notificações
  const openNotif = document.querySelector(
    ".notifications-sidebar-wrapper--open"
  );
  if (openNotif && isVisible(openNotif)) {
    return Array.from(openNotif.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
      (el) => !isIgnored(el) && isVisible(el)
    );
  }

  // 3. Procurar aba da Sidebar (force-open)
  const forceSidebar = document.querySelector(".sidebar-wrapper--force-open");
  if (forceSidebar && isVisible(forceSidebar)) {
    return Array.from(forceSidebar.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
      (el) => !isIgnored(el) && isVisible(el)
    );
  }

  // 4. Default pro <main> inteiro
  const root = document.querySelector("main") ?? document.body;
  return Array.from(root.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    (el) => !isIgnored(el) && isVisible(el)
  );
}

type Dir = "up" | "down" | "left" | "right";

function cx(r: DOMRect) {
  return (r.left + r.right) / 2;
}
function cy(r: DOMRect) {
  return (r.top + r.bottom) / 2;
}

function isAhead(from: DOMRect, to: DOMRect, dir: Dir): boolean {
  const M = 5;
  switch (dir) {
    case "up":
      return cy(to) < cy(from) - M;
    case "down":
      return cy(to) > cy(from) + M;
    case "left":
      return cx(to) < cx(from) - M;
    case "right":
      return cx(to) > cx(from) + M;
  }
}

function scoreEl(from: DOMRect, to: DOMRect, dir: Dir): number {
  const W = 2.5;
  switch (dir) {
    case "up":
      return cy(from) - cy(to) + Math.abs(cx(from) - cx(to)) * W;
    case "down":
      return cy(to) - cy(from) + Math.abs(cx(from) - cx(to)) * W;
    case "left":
      return cx(from) - cx(to) + Math.abs(cy(from) - cy(to)) * W;
    case "right":
      return cx(to) - cx(from) + Math.abs(cy(from) - cy(to)) * W;
  }
}

function moveFocus(dir: Dir): void {
  const candidates = getCandidates();
  if (candidates.length === 0) return;

  const active = document.activeElement;
  const mainEl = document.querySelector("main");

  // Sem foco, foco no body/html, foco fora do main, ou em zona ignorada
  // → focar no primeiro candidato dentro do main
  const activeIsOutside =
    !active ||
    active === document.body ||
    active === document.documentElement ||
    isIgnored(active) ||
    (mainEl && !mainEl.contains(active));

  if (activeIsOutside) {
    (candidates[0] as HTMLElement).focus({ preventScroll: false });
    return;
  }

  const fromRect = active.getBoundingClientRect();
  let best: Element | null = null;
  let bestScore = Infinity;

  const DOCUMENT_POSITION_PRECEDING = 2;
  const DOCUMENT_POSITION_FOLLOWING = 4;

  for (const el of candidates) {
    if (el === active) continue;
    const toRect = el.getBoundingClientRect();
    if (!isAhead(fromRect, toRect, dir)) continue;

    const pos = active.compareDocumentPosition(el);
    const isPreceding = (pos & DOCUMENT_POSITION_PRECEDING) !== 0;
    const isFollowing = (pos & DOCUMENT_POSITION_FOLLOWING) !== 0;

    // Prevent jumping backward in DOM for down/right moves (e.g. sticky headers overlaying content)
    if ((dir === "down" || dir === "right") && isPreceding) continue;
    // Prevent jumping forward in DOM for up/left moves (e.g. fixed footers overlaying content)
    if ((dir === "up" || dir === "left") && isFollowing) continue;

    const s = scoreEl(fromRect, toRect, dir);
    if (s < bestScore) {
      bestScore = s;
      best = el;
    }
  }

  if (best) {
    playBeep();
    (best as HTMLElement).focus({ preventScroll: false });
  }
}

/**
 * Ativa/desativa a classe `gamepad-active` no <html>
 * para mostrar outline de foco quando o controle está em uso.
 */
export function useGamepadActiveClass(): void {
  const isConnected = useGamepadConnected();

  useEffect(() => {
    if (isConnected) {
      document.documentElement.classList.add("gamepad-active");
    } else {
      document.documentElement.classList.remove("gamepad-active");
    }
  }, [isConnected]);
}

/**
 * Registra navegação espacial por D-Pad globalmente.
 * Prioridade 0 — a mais baixa; componentes locais (priority > 0) interceptam antes.
 */
export function useGlobalGamepadNavigation(): void {
  useGamepadActiveClass();

  useGamepad({
    priority: 0,
    onButton: {
      DPAD_UP: () => moveFocus("up"),
      DPAD_DOWN: () => moveFocus("down"),
      DPAD_LEFT: () => moveFocus("left"),
      DPAD_RIGHT: () => moveFocus("right"),
      A: () => {
        const el = document.activeElement as HTMLElement | null;
        el?.click();
      },
    },
  });
}

/** Mantido por compatibilidade — sem uso agora (sistema de prioridade resolve) */
export function useGamepadNavLock(_active: boolean): void {
  /* noop */
}
