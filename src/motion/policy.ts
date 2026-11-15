/**
 * The blog's root class is the single motion authority for every adapted animation.
 * A visitor's explicit blog choice wins; without one, the default follows the
 * system reduced-motion setting. This module is excluded from the build-time
 * adapter, so matchMedia here is the native browser query.
 */
export const MOTION_KEY = "mc-motion";
export const MOTION_CHANGE_EVENT = "ireina:motion-change";
const SYSTEM_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export type MotionChoice = "reduced" | "full";
// Fallback for this page when storage is unavailable (e.g. blocked by privacy settings).
let sessionChoice: MotionChoice | null = null;
const normalizeChoice = (value: unknown): MotionChoice | null => value === "reduced" || value === "full" ? value : null;

/** The visitor's explicit blog choice, or null when they have never chosen. */
export function getMotionChoice(): MotionChoice | null {
  try { return normalizeChoice(localStorage.getItem(MOTION_KEY)); } catch { return sessionChoice; }
}

/** Native system setting; consulted only while the visitor has made no choice. */
export function systemPrefersReducedMotion(): boolean {
  try { return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(SYSTEM_MOTION_QUERY).matches; }
  catch { return false; }
}

/** Explicit choice first, then the system setting. Mirrors the first-paint script in Layout.astro. */
export function resolveMotionPreference(): boolean {
  const choice = getMotionChoice();
  return choice ? choice === "reduced" : systemPrefersReducedMotion();
}

export function prefersReducedMotion(): boolean {
  return typeof document !== "undefined" && document.documentElement.classList.contains("motion-reduced");
}

export function getMotionPreference(): boolean {
  if (typeof document === "undefined") return false;
  if (document.documentElement.dataset.ireinaMotionReady === "true") return prefersReducedMotion();
  return resolveMotionPreference();
}

export function applyMotionPreference(reduced: boolean): void {
  if (typeof document === "undefined") return;
  const previous = prefersReducedMotion();
  document.documentElement.classList.toggle("motion-reduced", reduced);
  document.documentElement.dataset.ireinaMotionReady = "true";
  if (previous !== reduced) window.dispatchEvent(new CustomEvent(MOTION_CHANGE_EVENT, { detail: { reduced } }));
}

/** Record an explicit visitor choice. Call only from a user action, never on mount. */
export function setMotionPreference(reduced: boolean): void {
  sessionChoice = reduced ? "reduced" : "full";
  try { localStorage.setItem(MOTION_KEY, sessionChoice); } catch { /* Keep a usable session preference when storage is unavailable. */ }
  applyMotionPreference(reduced);
}

/** Forget the explicit choice and follow the system setting again. */
export function clearMotionPreference(): void {
  sessionChoice = null;
  try { localStorage.removeItem(MOTION_KEY); } catch { /* Session fallback is already cleared. */ }
  applyMotionPreference(systemPrefersReducedMotion());
}

/** Follow live system changes for visitors without an explicit choice. Returns cleanup. */
export function watchSystemMotion(): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia(SYSTEM_MOTION_QUERY);
  const listener = () => { if (!getMotionChoice()) applyMotionPreference(query.matches); };
  query.addEventListener?.("change", listener);
  return () => query.removeEventListener?.("change", listener);
}

/** Subscribers own cleanup; no persistent listener per generated media-query object. */
export function subscribeMotionPreference(callback: (reduced: boolean) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const listener = () => callback(prefersReducedMotion());
  window.addEventListener(MOTION_CHANGE_EVENT, listener);
  return () => window.removeEventListener(MOTION_CHANGE_EVENT, listener);
}

/** Scoped compatibility adapter; preserves EventTarget once/signal/receiver semantics. */
export function motionMediaQuery(query = "(prefers-reduced-motion: reduce)"): MediaQueryList {
  const normalized = query.toLowerCase();
  const full = /:\s*no-preference\s*\)/.test(normalized);
  if (!/^\(\s*prefers-reduced-motion\s*:\s*(reduce|no-preference)\s*\)$/.test(normalized)) throw new Error("Unsupported motion query");
  type Listener = EventListenerOrEventListenerObject;
  class BlogMediaQuery extends EventTarget {
    readonly media = query;
    private records: { listener: Listener; wrapped: EventListener; capture: boolean; signal?: AbortSignal; abort?: () => void }[] = [];
    private unsubscribe?: () => void;
    private handler: ((this: MediaQueryList, event: MediaQueryListEvent) => unknown) | null = null;
    private readonly dispatchOnChange: EventListener = event => { this.handler?.call(this as unknown as MediaQueryList, event as MediaQueryListEvent); };
    get matches() { return full ? !prefersReducedMotion() : prefersReducedMotion(); }
    get onchange() { return this.handler; }
    set onchange(value) {
      if (this.handler) this.removeEventListener("change", this.dispatchOnChange);
      this.handler = value;
      if (value) this.addEventListener("change", this.dispatchOnChange);
    }
    private sync() {
      if (this.records.length) this.unsubscribe ??= subscribeMotionPreference(() => {
        const event = new Event("change");
        Object.defineProperties(event, { matches: { value: this.matches }, media: { value: this.media } });
        this.dispatchEvent(event);
      });
      else { this.unsubscribe?.(); this.unsubscribe = undefined; }
    }
    addEventListener(type: string, listener: Listener | null, options?: boolean | AddEventListenerOptions): void {
      if (type !== "change") { super.addEventListener(type, listener, options); return; }
      if (!listener) return;
      const opts = typeof options === "boolean" ? { capture: options } : options ?? {};
      const capture = opts.capture ?? false;
      if (opts.signal?.aborted || this.records.some(record => record.listener === listener && record.capture === capture)) return;
      const wrapped: EventListener = event => {
        if (opts.once) this.removeEventListener(type, listener, capture);
        if (typeof listener === "function") listener.call(this, event);
        else listener.handleEvent(event);
      };
      const abort = opts.signal ? () => this.removeEventListener(type, listener, capture) : undefined;
      this.records.push({ listener, wrapped, capture, signal: opts.signal, abort });
      super.addEventListener(type, wrapped, { capture, passive: opts.passive });
      if (abort) opts.signal!.addEventListener("abort", abort, { once: true });
      this.sync();
    }
    removeEventListener(type: string, listener: Listener | null, options?: boolean | EventListenerOptions): void {
      if (type !== "change") { super.removeEventListener(type, listener, options); return; }
      const capture = typeof options === "boolean" ? options : options?.capture ?? false;
      const index = this.records.findIndex(record => record.listener === listener && record.capture === capture);
      if (index < 0) return;
      const [record] = this.records.splice(index, 1);
      super.removeEventListener(type, record.wrapped, capture);
      if (record.abort) record.signal?.removeEventListener("abort", record.abort);
      this.sync();
    }
    addListener(listener: ((this: MediaQueryList, event: MediaQueryListEvent) => unknown) | null): void { this.addEventListener("change", listener as EventListener | null); }
    removeListener(listener: ((this: MediaQueryList, event: MediaQueryListEvent) => unknown) | null): void { this.removeEventListener("change", listener as EventListener | null); }
  }
  return new BlogMediaQuery() as unknown as MediaQueryList;
}
