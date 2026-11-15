import { prefersReducedMotion } from './policy';

type ScrollController = {
  _raf: number | null;
  options: { onCancel?: () => void };
};
type SwupMotionHost = {
  scrollTo?: (top: number, animate?: boolean) => void;
  findPlugin?: (name: string) => { scrl?: ScrollController } | undefined;
};

/** scrl@2 / SwupScrollPlugin@3.3: reproduce its own wheel-cancel contract.
 * There is no public cancel API. onCancel emits scroll:end and settles the
 * theme's page-height extension. No synthetic input or global scroll override.
 */
export function cancelSwupScroll(): void {
  const swup = window.swup as unknown as SwupMotionHost | undefined;
  const controller = swup?.findPlugin?.('SwupScrollPlugin')?.scrl;
  if (!controller || typeof controller._raf !== 'number' || typeof controller.options?.onCancel !== 'function') return;
  cancelAnimationFrame(controller._raf);
  controller._raf = null;
  controller.options.onCancel();
}

const bound = new WeakSet<object>();
export function bindSwupMotion(): void {
  const swup = window.swup as unknown as SwupMotionHost | undefined;
  if (!swup?.scrollTo || bound.has(swup)) return;
  const original = swup.scrollTo;
  swup.scrollTo = function (top, animate = true) {
    cancelSwupScroll();
    original.call(swup, top, animate && !prefersReducedMotion());
  };
  bound.add(swup);
  if (prefersReducedMotion()) cancelSwupScroll();
}
