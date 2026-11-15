/** 按需、无图片/网络依赖的装饰层；运行时拥有启动和销毁，不进默认主包。 */
export function startSakura(config: { desktopCount: number; mobileCount: number }): { destroy(): void } {
  const canvas = document.createElement("canvas");
  canvas.id = "ireina-sakura";
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:fixed;inset:0;width:100%;height:100%;z-index:35;pointer-events:none;";
  const context = canvas.getContext("2d");
  if (!context) return { destroy() {} };
  document.body.append(canvas);
  const root = document.documentElement;
  let width = innerWidth, height = innerHeight, frame = 0, previous = 0, disposed = false;
  // 花瓣颜色取主题令牌；主题色和明暗模式写在 <html> 的 style / class 上，变化时重新取色。
  const readColor = () => getComputedStyle(root).getPropertyValue("--tertiary-container").trim();
  let color = readColor();
  const createPetal = () => ({ x: Math.random() * width, y: Math.random() * height, size: 4 + Math.random() * 5, speed: 20 + Math.random() * 28, angle: Math.random() * Math.PI * 2, phase: Math.random() * 6 });
  const targetCount = () => innerWidth < 768 ? config.mobileCount : config.desktopCount;
  const petals = Array.from({ length: targetCount() }, createPetal);
  const resize = () => {
    width = innerWidth; height = innerHeight;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    // 窗口跨过手机/桌面宽度时同步花瓣数量。
    const count = targetCount();
    if (petals.length > count) petals.length = count;
    while (petals.length < count) petals.push(createPetal());
    color = readColor();
  };
  resize();
  const themeObserver = new MutationObserver(() => { color = readColor(); });
  themeObserver.observe(root, { attributes: true, attributeFilter: ["class", "style"] });
  const draw = (now: number) => {
    if (disposed) return;
    const dt = Math.min((now - (previous || now)) / 1000, .04); previous = now;
    context.clearRect(0, 0, width, height);
    context.fillStyle = color; context.globalAlpha = .85;
    for (const p of petals) {
      p.y += p.speed * dt; p.x += (9 + Math.sin(now / 1800 + p.phase) * 14) * dt; p.angle += dt * .6;
      if (p.y > height + 12) { p.y = -12; p.x = Math.random() * width; }
      if (p.x > width + 12) p.x = -12;
      context.save(); context.translate(p.x, p.y); context.rotate(p.angle);
      context.beginPath(); context.moveTo(0, -p.size);
      context.bezierCurveTo(p.size, -p.size / 2, p.size, p.size / 2, 0, p.size);
      context.bezierCurveTo(-p.size / 2, p.size / 3, -p.size, -p.size / 2, 0, -p.size);
      context.fill(); context.restore();
    }
    frame = requestAnimationFrame(draw);
  };
  frame = requestAnimationFrame(draw);
  window.addEventListener("resize", resize);
  return {
    destroy() {
      disposed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      themeObserver.disconnect();
      canvas.remove();
    },
  };
}
