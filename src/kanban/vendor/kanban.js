// src/utils.ts
var e = class {
	map = /* @__PURE__ */ new Map();
	on(e, t) {
		return this.map.has(e) || this.map.set(e, /* @__PURE__ */ new Set()), this.map.get(e).add(t), () => this.map.get(e)?.delete(t);
	}
	emit(e, ...t) {
		this.map.get(e)?.forEach((e) => {
			try {
				e(...t);
			} catch (e) {
				console.error("[kanban]", e);
			}
		});
	}
	clear() {
		this.map.clear();
	}
};
function t(e, t) {
	let n = {};
	try {
		n = JSON.parse(localStorage.getItem(e) || "{}");
	} catch {}
	return {
		get: (e) => t || e === "visits" ? n[e] : void 0,
		set(t, r) {
			r === void 0 ? delete n[t] : n[t] = r;
			try {
				localStorage.setItem(e, JSON.stringify(n));
			} catch {}
		}
	};
}
var n = (e) => new Promise((t) => setTimeout(t, e));
function r(e, t = 3e3) {
	let n = () => "requestIdleCallback" in window ? requestIdleCallback(() => e(), { timeout: t }) : setTimeout(e, 600);
	document.readyState === "complete" ? n() : addEventListener("load", n, { once: !0 });
}
var i = () => !!navigator.connection?.saveData, a = () => matchMedia("(prefers-reduced-motion: reduce)").matches, o = class {
	el;
	opts;
	textEl;
	priority = 0;
	busyUntil = 0;
	protectUntil = 0;
	timers = [];
	constructor(e, t) {
		this.el = e, this.opts = t, this.textEl = document.createElement("span");
		let n = document.createElement("i");
		n.className = "cursor", e.append(this.textEl, n);
	}
	get speaking() {
		return Date.now() < this.busyUntil;
	}
	show(e, t = 1, n = this.opts.duration) {
		if (!e || Date.now() < this.protectUntil && t < this.priority) return !1;
		this.clear();
		let r = a() ? 0 : this.opts.typingSpeed, i = [...e], o = r > 0 ? i.length * r : 0;
		if (this.priority = t, this.busyUntil = Date.now() + o + n, this.protectUntil = Date.now() + o + Math.min(n, 1500), this.el.classList.remove("pop"), this.el.offsetWidth, this.el.classList.add("show", "pop"), this.opts.onSay(e), r > 0) this.el.classList.add("typing"), this.textEl.textContent = "", i.forEach((e, t) => {
			this.later(() => {
				this.textEl.textContent += e, this.opts.mouth(/[\s,.!?;:,。!?;:~…、]/.test(e) ? 0 : .35 + Math.random() * .65);
			}, t * r);
		}), this.later(() => {
			this.el.classList.remove("typing"), this.opts.mouth(null);
		}, o + 60);
		else {
			this.textEl.textContent = e;
			let t = Math.min(i.length * 70, 2200);
			for (let e = 0; e < t; e += 110) this.later(() => this.opts.mouth(Math.random() * .9), e);
			this.later(() => this.opts.mouth(null), t + 60);
		}
		return this.later(() => this.hide(), o + n), !0;
	}
	hide() {
		this.clear(), this.el.classList.remove("show", "typing"), this.priority = 0, this.busyUntil = 0, this.protectUntil = 0;
	}
	later(e, t) {
		this.timers.push(window.setTimeout(e, t));
	}
	clear() {
		this.timers.forEach(clearTimeout), this.timers = [], this.opts.mouth(null);
	}
}, s = (e) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${e}</svg>`, c = {
	talk: s("<path d=\"M4 5h16v11H9l-5 4z\"/><path d=\"M8 10h.01M12 10h.01M16 10h.01\"/>"),
	dress: s("<path d=\"M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z\"/><path d=\"M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z\"/>"),
	switch: s("<path d=\"M4 7h13\"/><path d=\"M14 4l3 3-3 3\"/><path d=\"M20 17H7\"/><path d=\"M10 14l-3 3 3 3\"/>"),
	photo: s("<path d=\"M4 8h3l2-3h6l2 3h3v11H4z\"/><circle cx=\"12\" cy=\"13\" r=\"3.5\"/>"),
	sleep: s("<path d=\"M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z\"/>"),
	about: s("<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 11v5\"/><path d=\"M12 8h.01\"/>"),
	close: s("<path d=\"M6 6l12 12M18 6L6 18\"/>"),
	paw: s("<circle cx=\"7\" cy=\"10\" r=\"1.8\"/><circle cx=\"11\" cy=\"6.5\" r=\"1.8\"/><circle cx=\"15.5\" cy=\"7.5\" r=\"1.8\"/><circle cx=\"18\" cy=\"12\" r=\"1.8\"/><path d=\"M8.5 17.5c0-2.5 2-4.5 4-4.5s3.5 1.5 3.5 3.5-1.5 3-3.5 3-4 .5-4-2z\"/>")
}, l = "\n:host {\n  all: initial;\n  position: fixed;\n  inset: 0;\n  pointer-events: none;\n  z-index: var(--kb-z, 9990);\n  font-family: 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;\n  /* 内部变量:页面上写 :root { --kb-primary: ... } 就能覆盖 */\n  --_primary: var(--kb-primary, #f472b6);\n  --_bg: var(--kb-bubble-bg, hsl(0 0% 100% / 0.72));\n  --_color: var(--kb-bubble-color, #3b3549);\n  --_border: var(--kb-bubble-border, hsl(0 0% 100% / 0.75));\n  --_blur: var(--kb-blur, 12px);\n  --kb-ease: cubic-bezier(0.19, 1, 0.22, 1);\n}\n:host([data-theme='dark']) {\n  --_bg: var(--kb-bubble-bg-dark, hsl(250 25% 14% / 0.75));\n  --_color: var(--kb-bubble-color-dark, #ece9f6);\n  --_border: var(--kb-bubble-border-dark, hsl(0 0% 100% / 0.12));\n}\n:host([hidden]) { display: none; }\n* { box-sizing: border-box; }\n\n/* ---------- 舞台 ---------- */\n.stage {\n  position: absolute;\n  bottom: var(--kb-y, 0px);\n  left: var(--kb-x, 0px);\n  width: var(--kb-w);\n  height: var(--kb-h);\n  transform: translateY(calc(100% + var(--kb-y, 0px) + 20px));\n  opacity: 0;\n  transition: transform var(--kb-t) var(--kb-stage-ease, var(--kb-ease)), opacity calc(var(--kb-t) * 0.6) ease;\n}\n:host([data-pos='right']) .stage { left: auto; right: var(--kb-x, 0px); }\n.stage.on { transform: none; opacity: 1; }\n.stage.dragging { transition: none; }\n.actor {\n  display: block;\n  width: 100%;\n  height: 100%;\n  pointer-events: auto;\n  cursor: grab;\n  touch-action: none;\n  -webkit-tap-highlight-color: transparent;\n}\n.stage.dragging .actor { cursor: grabbing; }\n:host([data-drag='off']) .actor { cursor: pointer; touch-action: auto; }\n\n/* ---------- 对话气泡 ---------- */\n.bubble {\n  position: absolute;\n  left: 50%;\n  top: var(--kb-bubble-top, 4%);\n  width: max-content;\n  max-width: min(250px, 80vw);\n  min-height: 42px;\n  padding: 10px 15px;\n  border-radius: 16px;\n  font-size: 14px;\n  line-height: 1.65;\n  color: var(--_color);\n  background: var(--_bg);\n  border: 1px solid var(--_border);\n  backdrop-filter: blur(var(--_blur)) saturate(160%);\n  -webkit-backdrop-filter: blur(var(--_blur)) saturate(160%);\n  box-shadow: 0 10px 30px -10px rgb(0 0 0 / 0.35), inset 0 0 0 1px hsl(0 0% 100% / 0.08);\n  opacity: 0;\n  transform: translate(-50%, calc(-100% + 8px)) scale(0.94);\n  transform-origin: 50% 100%;\n  transition: opacity 0.3s ease, transform 0.35s var(--kb-ease);\n  pointer-events: none;\n  word-break: break-word;\n}\n.bubble::before {\n  content: '';\n  position: absolute;\n  left: 0; top: 0; bottom: 0;\n  width: 4px;\n  border-radius: 16px 0 0 16px;\n  background: var(--_primary);\n  opacity: 0.85;\n}\n.bubble::after {\n  content: '';\n  position: absolute;\n  left: 50%;\n  bottom: -7px;\n  width: 12px;\n  height: 12px;\n  background: inherit;\n  border: inherit;\n  border-top: 0;\n  border-left: 0;\n  transform: translateX(-50%) rotate(45deg);\n  backdrop-filter: none;\n}\n.bubble.show { opacity: 1; transform: translate(-50%, -100%) scale(1); }\n.bubble.pop { animation: pop 0.45s var(--kb-ease); }\n@keyframes pop {\n  0% { transform: translate(-50%, -100%) scale(0.9); }\n  45% { transform: translate(-50%, -100%) scale(1.04); }\n  100% { transform: translate(-50%, -100%) scale(1); }\n}\n.cursor {\n  display: inline-block;\n  width: 2px;\n  height: 1em;\n  margin-left: 2px;\n  vertical-align: -2px;\n  background: var(--_primary);\n  animation: blink 0.8s steps(1) infinite;\n}\n.bubble:not(.typing) .cursor { display: none; }\n@keyframes blink { 50% { opacity: 0; } }\n\n/* 实心气泡(bubble: 'solid'):主题色底、白字,小三角跟着变色 */\n:host([data-bubble='solid']) .bubble {\n  --_bg: color-mix(in srgb, var(--_primary) 90%, transparent);\n  --_color: #fff;\n  --_border: transparent;\n  min-height: 0;\n  padding: 8px 14px;\n  border-radius: 10px;\n  font-size: 13px;\n  backdrop-filter: none;\n  -webkit-backdrop-filter: none;\n  box-shadow: 0 8px 22px -10px var(--_primary);\n}\n:host([data-bubble='solid']) .bubble::before { display: none; }\n:host([data-bubble='solid']) .cursor { background: #fff; }\n\n/* 浮动(bubbleFloat):弹出后一直轻轻上下飘;先播完弹出动画再开始飘 */\n@keyframes float {\n  0%, 100% { transform: translate(-50%, -100%); }\n  50% { transform: translate(-50%, calc(-100% - 5px)); }\n}\n:host([data-float]) .bubble.show { animation: float 2.5s ease-in-out infinite; }\n:host([data-float]) .bubble.show.pop { animation: pop 0.45s var(--kb-ease), float 2.5s ease-in-out 0.45s infinite; }\n\n/* ---------- 菜单 ---------- */\n.menu {\n  position: absolute;\n  bottom: 6%;\n  right: 4px;\n  display: flex;\n  flex-direction: column;\n  gap: 6px;\n  opacity: 0;\n  transform: translateX(-8px);\n  transition: opacity 0.25s ease, transform 0.3s var(--kb-ease);\n  pointer-events: none;\n}\n:host([data-pos='right']) .menu { right: auto; left: 4px; transform: translateX(8px); }\n.stage:hover .menu, .stage.menu-open .menu, .menu:focus-within {\n  opacity: 1;\n  transform: none;\n  pointer-events: auto;\n}\n.stage.dragging .menu { opacity: 0; pointer-events: none; }\n.menu button {\n  position: relative;\n  width: 30px;\n  height: 30px;\n  padding: 0;\n  border: 0;\n  border-radius: 50%;\n  display: grid;\n  place-items: center;\n  color: #fff;\n  background: var(--_primary);\n  box-shadow: 0 4px 12px -4px var(--_primary), inset 0 0 0 1px hsl(0 0% 100% / 0.25);\n  cursor: pointer;\n  transition: transform 0.25s var(--kb-ease), filter 0.2s;\n}\n.menu button:hover, .menu button:focus-visible { transform: scale(1.14); filter: brightness(1.08); outline: none; }\n.menu svg { width: 16px; height: 16px; }\n.menu button::after {\n  content: attr(aria-label);\n  position: absolute;\n  top: 50%;\n  left: calc(100% + 8px);\n  padding: 3px 8px;\n  border-radius: 6px;\n  font-size: 12px;\n  white-space: nowrap;\n  color: #fff;\n  background: rgb(30 27 40 / 0.85);\n  opacity: 0;\n  transform: translate(-4px, -50%);\n  transition: 0.2s;\n  pointer-events: none;\n}\n:host([data-pos='right']) .menu button::after { left: auto; right: calc(100% + 8px); transform: translate(4px, -50%); }\n.menu button:hover::after, .menu button:focus-visible::after { opacity: 1; transform: translate(0, -50%); }\n\n/* ---------- 状态条(加载中 / 休息中 / 召唤) ---------- */\n.status {\n  position: absolute;\n  bottom: 72px;\n  left: 0;\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  padding: 8px 16px 8px 12px;\n  border: 0;\n  border-radius: 0 999px 999px 0;\n  font: inherit;\n  font-size: 13px;\n  color: #fff;\n  background: var(--_primary);\n  box-shadow: 0 6px 18px -6px var(--_primary);\n  cursor: pointer;\n  pointer-events: auto;\n  transform: translateX(-105%);\n  transition: transform 0.5s var(--kb-ease), background 0.3s;\n}\n:host([data-pos='right']) .status { left: auto; right: 0; border-radius: 999px 0 0 999px; padding: 8px 12px 8px 16px; transform: translateX(105%); }\n.status.show { transform: none; }\n.status:hover { filter: brightness(1.06); }\n.status:focus-visible { outline: 2px solid #fff; outline-offset: -4px; }\n.status.busy { cursor: default; }\n.status.error { background: #ef4444; box-shadow: 0 6px 18px -6px #ef4444; }\n.status svg { width: 16px; height: 16px; flex: none; }\n.status.busy svg { animation: paw 0.9s ease-in-out infinite; }\n@keyframes paw { 50% { transform: translateY(-3px) rotate(-12deg); } }\n\n/* 竖向小标签(status: 'tab'):贴着屏幕边缘,文字竖排;竖排时 flex 的主轴本身就是竖的 */\n:host([data-status='tab']) .status {\n  padding: 14px 7px;\n  border-radius: 0 10px 10px 0;\n  writing-mode: vertical-rl;\n  font-size: 12px;\n  letter-spacing: 2px;\n}\n:host([data-pos='right'][data-status='tab']) .status { padding: 14px 7px; border-radius: 10px 0 0 10px; }\n:host([data-status='tab']) .status .hint { display: none; }\n\n@media (max-width: 767px) {\n  .stage { width: calc(var(--kb-w) * 0.68); height: calc(var(--kb-h) * 0.68); }\n  .bubble { font-size: 13px; max-width: min(200px, 70vw); }\n}\n@media (prefers-reduced-motion: reduce) {\n  .stage, .bubble, .status, .menu { transition-duration: 0.01ms; }\n  /* Explicit entrance/exit opt-ins restore only their stage transitions.\n     All unrelated reduced-motion rules stay unchanged. */\n  :host([data-entrance='slide']) .stage.on:not(.dragging),\n  :host([data-exit='slide']) .stage:not(.on):not(.dragging) {\n    transition-duration: var(--kb-t), calc(var(--kb-t) * 0.6);\n  }\n  .bubble.pop, .status.busy svg { animation: none; }\n  :host([data-float]) .bubble.show, :host([data-float]) .bubble.show.pop { animation: none; }\n}\n";
// src/dom.ts
function u(e, t, n) {
	let r = document.createElement("kanban-widget");
	r.style.setProperty("--kb-w", `${e}px`), r.style.setProperty("--kb-h", `${t}px`), r.style.setProperty("--kb-t", `${n}ms`);
	let i = r.attachShadow({ mode: "open" });
	i.innerHTML = `<style>${l}</style>
    <div class="stage" part="stage">
      <div class="bubble" part="bubble" role="status" aria-live="polite"></div>
      <div class="menu" part="menu" role="toolbar" aria-label="看板娘菜单"></div>
    </div>
    <button class="status" part="status" type="button"></button>`;
	let a = (e) => i.querySelector(e);
	return {
		host: r,
		stage: a(".stage"),
		bubble: a(".bubble"),
		menu: a(".menu"),
		status: new d(a(".status"))
	};
}
var d = class {
	el;
	onClick = null;
	constructor(e) {
		this.el = e, e.addEventListener("click", () => this.onClick?.());
	}
	show(e, t, n) {
		let [r, i] = e.split(" · ");
		this.el.innerHTML = `${c.paw}<span class="main">${r}</span>${i ? `<span class="hint"> · ${i}</span>` : ""}`, this.el.className = `status show ${t === "busy" ? "busy" : ""} ${t === "error" ? "error" : ""}`, this.el.setAttribute("aria-label", e), this.el.title = e, this.onClick = n ?? null;
	}
	text(e) {
		let t = this.el.querySelector(".main");
		t && (t.textContent = e);
	}
	hide() {
		this.el.classList.remove("show"), this.onClick = null;
	}
};
function f(e, t) {
	let n = document.documentElement, r = matchMedia("(prefers-color-scheme: dark)"), i = () => {
		let i;
		if (t !== "auto") i = t === "dark";
		else if (n.classList.contains("dark") || n.dataset.theme === "dark") i = !0;
		else if (n.classList.contains("light") || n.dataset.theme === "light") i = !1;
		else {
			let e = p();
			if (e !== null) i = e < .4;
			else {
				let e = getComputedStyle(n).colorScheme;
				i = e === "dark" || e !== "light" && r.matches;
			}
		}
		e.dataset.theme = i ? "dark" : "light";
	};
	if (i(), t !== "auto") return () => {};
	let a = new MutationObserver(i);
	a.observe(n, {
		attributes: !0,
		attributeFilter: [
			"class",
			"data-theme",
			"style"
		]
	}), r.addEventListener("change", i);
	let o = (e) => {
		(e.target === n || e.target === document.body) && i();
	};
	return n.addEventListener("transitionend", o), () => {
		a.disconnect(), r.removeEventListener("change", i), n.removeEventListener("transitionend", o);
	};
}
function p() {
	for (let e of [document.documentElement, document.body]) {
		let t = getComputedStyle(e).backgroundColor.match(/[\d.]+/g);
		if (!t || t.length < 3) continue;
		let [n = 0, r = 0, i = 0, a = 1] = t.map(Number);
		if (!(a < .5)) return (.2126 * n + .7152 * r + .0722 * i) / 255;
	}
	return null;
}
// src/drag.ts
var m = 6;
function h(e, t) {
	let { width: n, height: r } = t.getBoundingClientRect();
	return {
		x: Math.round(Math.min(Math.max(e.x, -n * .3), innerWidth - n * .7)),
		y: Math.round(Math.min(Math.max(e.y, -r * .15), innerHeight - r * .6))
	};
}
function g(e) {
	let t = new AbortController(), { signal: n } = t, r = null, i = !1, a = 0;
	e.stage.addEventListener("click", (e) => {
		Date.now() < a && e.stopPropagation();
	}, {
		capture: !0,
		signal: n
	}), e.stage.addEventListener("pointerdown", (t) => {
		t.button === 0 && t.target.closest?.(".actor") && (r = {
			x: t.clientX,
			y: t.clientY,
			pos: e.getPos(),
			id: t.pointerId
		}, i = !1);
	}, { signal: n }), addEventListener("pointermove", (t) => {
		if (!r || t.pointerId !== r.id || !e.enabled) return;
		let n = t.clientX - r.x, a = t.clientY - r.y;
		if (!i && Math.hypot(n, a) < m) return;
		i || (i = !0, e.stage.classList.add("dragging"));
		let o = e.side === "left" ? r.pos.x + n : r.pos.x - n;
		e.setPos(h({
			x: o,
			y: r.pos.y - a
		}, e.stage));
	}, {
		signal: n,
		passive: !0
	});
	let o = (t) => {
		r && t.pointerId === r.id && (i ? (e.stage.classList.remove("dragging"), e.onEnd(e.getPos()), a = Date.now() + 300) : t.type === "pointerup" && e.onTap(t), r = null, i = !1);
	};
	return addEventListener("pointerup", o, { signal: n }), addEventListener("pointercancel", o, { signal: n }), () => t.abort();
}
// src/messages.ts
var _ = (e) => e[Math.floor(Math.random() * e.length)], v = (e) => typeof e == "string" ? e : _(e);
function y(e = /* @__PURE__ */ new Date()) {
	let t = e.getHours();
	return _(t < 5 ? ["夜深了,早点休息哦,熬夜会变成熊猫的 (｡•́︿•̀｡)", "这么晚还不睡吗?我陪你一会儿吧~"] : t < 9 ? ["早上好!一日之计在于晨,今天也要元气满满 ✧", "早安~吃早饭了吗?"] : t < 12 ? ["上午好!工作学习要专心哦~", "上午好,今天想看点什么呢?"] : t < 14 ? ["中午了,该吃饭啦!", "午安~吃完饭记得歇一会儿"] : t < 18 ? ["下午好,来杯奶茶提提神吧~", "下午容易犯困,站起来活动一下吧"] : t < 22 ? ["晚上好!今天过得怎么样?", "晚上好~窗外的月亮好看吗?"] : ["已经很晚了,看完这篇就去睡吧~", "夜猫子你好呀 (=・ω・=)"]);
}
var b = {
	welcome: [],
	idle: [
		"好久没动了,起来伸个懒腰吧~",
		"记得多喝水哦!",
		"盯着屏幕太久了,看看远处休息一下眼睛吧",
		"我在这里陪着你~",
		"有什么想看的,可以用上面的菜单找找哦",
		"点点我试试?"
	],
	tap: {
		Head: [
			"别摸头啦,会长不高的!",
			"嘿嘿~",
			"再摸我就要生气了哦 (╯‵□′)╯"
		],
		Body: [
			"你在干什么呀?",
			"不要乱戳啦!",
			"有什么事吗?",
			"呜…好痒"
		],
		default: [
			"你好呀~",
			"找我有事吗?",
			"嗯?"
		]
	},
	hover: [],
	click: [],
	copy: ["复制好了!转载记得注明出处哦~", "要把这段带走吗?记得标明来源哦"],
	back: [
		"欢迎回来~",
		"你回来啦!我等你好久了",
		"刚刚去哪了呀?"
	],
	away: [
		"你还在吗?",
		"是不是去忙别的了?",
		"我有点无聊了…"
	],
	bottom: ["已经看到底啦!", "看完了?要不要去看看别的文章~"],
	dates: [
		{
			date: "01-01",
			text: "新年快乐!新的一年也请多多关照~"
		},
		{
			date: "02-14",
			text: "今天是情人节哦,有人陪你吗?"
		},
		{
			date: "05-01",
			text: "劳动节快乐!今天就好好休息吧"
		},
		{
			date: "10-01~10-07",
			text: "国庆假期快乐!出去玩了吗?"
		},
		{
			date: "10-31",
			text: "Trick or Treat!不给糖就捣蛋~"
		},
		{
			date: "12-24~12-25",
			text: "圣诞快乐!今晚会有礼物吗?"
		}
	]
};
function x(...e) {
	let t = {
		...b,
		tap: { ...b.tap }
	};
	for (let n of e) if (n) for (let [e, r] of Object.entries(n)) r !== void 0 && (e === "tap" ? t.tap = {
		...t.tap,
		...r
	} : t[e] = r);
	return t;
}
function S(e, t = /* @__PURE__ */ new Date()) {
	let n = (t.getMonth() + 1) * 100 + t.getDate(), r = (e) => {
		let [t, n] = e.trim().split("-").map(Number);
		return t * 100 + n;
	};
	for (let t of e ?? []) {
		let [e, i = e] = t.date.split("~");
		if (n >= r(e) && n <= r(i)) return v(t.text);
	}
	return null;
}
function C(e, t) {
	return e.replace(/\{(\w+)\}/g, (e, n) => n in t ? String(t[n]) : e);
}
// src/look-math.ts
var w = (e, t, n, r) => Number.isFinite(e) ? Math.min(r, Math.max(n, e)) : t;
function T(e = {}) {
	return {
		sensitivity: w(e.sensitivity, 1.2, .1, 3),
		headMax: w(e.headMax, .75, 0, .75),
		eyeMax: w(e.eyeMax, .95, 0, 1),
		headResponse: w(e.headResponse, 120, 0, 1e3),
		eyeResponse: w(e.eyeResponse, 55, 0, 1e3),
		idleDelay: w(e.idleDelay, 5e3, 0, 6e4),
		leaveDelay: w(e.leaveDelay, 180, 0, 2e3),
		returnResponse: w(e.returnResponse, 160, 40, 500),
		reentryDuration: w(e.reentryDuration, 180, 80, 400),
		reducedHeadScale: w(e.reducedHeadScale, .6, 0, 1)
	};
}
function E(e, t) {
	return t ? {
		...e,
		headMax: e.headMax * e.reducedHeadScale,
		eyeMax: e.eyeMax * .75,
		headResponse: 0,
		eyeResponse: 0
	} : e;
}
function D(e, t) {
	return t ? Math.min(e.returnResponse, 90) : e.returnResponse;
}
function O(e, t, n, r) {
	let i = Math.hypot(e, t);
	if (!i || !r) return {
		x: 0,
		y: 0
	};
	let a = r * Math.tanh(i * n / r) / i;
	return {
		x: e * a,
		y: t * a
	};
}
function k(e, t, n, r, i) {
	if (![
		e,
		t,
		n,
		r
	].every(Number.isFinite) || n <= 0 || r <= 0) return {
		head: {
			x: 0,
			y: 0
		},
		eyes: {
			x: 0,
			y: 0
		}
	};
	let a = e * 2 / n, o = t * 2 / r;
	return {
		head: O(a, o, i.sensitivity, i.headMax),
		eyes: O(a, o, i.sensitivity * 1.2, i.eyeMax)
	};
}
function A(e, t, n) {
	return Math.min(1, e + Math.min(Math.max(0, t), 24, n / 8) / n);
}
function j(e, t, n) {
	let r = Math.max(0, Math.min(1, n)), i = r * r * (3 - 2 * r);
	return {
		x: e.x + (t.x - e.x) * i,
		y: e.y + (t.y - e.y) * i
	};
}
function M(e, t, n, r) {
	let i = r <= 0 ? 1 : -Math.expm1(-Math.max(0, n) / r);
	return {
		x: e.x + (t.x - e.x) * i,
		y: e.y + (t.y - e.y) * i
	};
}
// src/look-driver.ts
function N(e) {
	let t = e._state, n = t?.l2d6Model, r = n?._subdelegates?.[0]?.getLive2DManager?.(), i = r?._models?.[0]?._look;
	if (n?.mouseMoveEventListener && r?.onDrag && i?.getParameters && i.updateParameters) {
		let e = i.updateParameters, t = {
			x: 0,
			y: 0
		}, a = {
			x: 0,
			y: 0
		}, o = (e) => {
			for (let n of i.getParameters()) {
				let r = n.parameterId.getString?.() ?? n.parameterId._id ?? "", i = /^(ParamEyeBall[XY]|PARAM_EYE_BALL_[XY])$/.test(r) ? a : t;
				e.addParameterValueById(n.parameterId, n.factorX * i.x + n.factorY * i.y + n.factorXY * i.x * i.y);
			}
		};
		return i.updateParameters = o, document.removeEventListener("mousemove", n.mouseMoveEventListener), n.mouseEndedEventListener && document.removeEventListener("mouseout", n.mouseEndedEventListener), r.onDrag(0, 0), {
			apply: (e, n) => {
				t = e, a = n;
			},
			release: () => {
				t = {
					x: 0,
					y: 0
				}, a = {
					x: 0,
					y: 0
				}, i.updateParameters === o && (i.updateParameters = e), document.addEventListener("mousemove", n.mouseMoveEventListener), n.mouseEndedEventListener && document.addEventListener("mouseout", n.mouseEndedEventListener);
			}
		};
	}
	let a = t?.l2d2Model;
	return a?._boundMouseEvent && a.dragMgr ? (document.removeEventListener("mousemove", a._boundMouseEvent), document.removeEventListener("mouseout", a._boundMouseEvent), {
		apply: (e) => a.dragMgr?.setPoint(e.x, e.y),
		release: () => {
			a.dragMgr?.setPoint(0, 0), document.addEventListener("mousemove", a._boundMouseEvent), document.addEventListener("mouseout", a._boundMouseEvent);
		}
	}) : null;
}
// src/model.ts
var P = null, F = () => P ??= import("./l2d-BS92TdHz.js");
function I(e, t, n) {
	let r = document.createElement("canvas");
	r.className = "actor", r.width = t, r.height = n;
	let i = e.querySelector(".actor");
	return i ? i.replaceWith(r) : e.prepend(r), r;
}
async function L(e, t, n) {
	let r = await fetch(t.path);
	if (!r.ok) throw Error(`模型文件请求失败:HTTP ${r.status}`);
	let i = await r.json();
	return e.on("loadprogress", (e, t) => n(e, t)), await new Promise((n, r) => {
		let i = setTimeout(() => r(/* @__PURE__ */ Error("模型加载超时")), 3e4);
		e.on("loaded", () => {
			clearTimeout(i), n();
		}), e.load({
			path: t.path,
			scale: t.scale,
			position: t.offset,
			volume: t.volume ?? 0,
			logLevel: "error"
		}).catch((e) => {
			clearTimeout(i), r(e instanceof Error ? e : Error(String(e)));
		});
	}), i;
}
function R(e) {
	let t = e.getCanvas();
	try {
		e.destroy();
	} catch {}
	(t.getContext("webgl2") ?? t.getContext("webgl"))?.getExtension("WEBGL_lose_context")?.loseContext();
}
function z(e, t, n) {
	if (t.mouthParam === !1) return null;
	if (t.mouthParam) return t.mouthParam;
	let r = e.getParams().map((e) => e.id), i = n.Groups?.find((e) => e.Name === "LipSync")?.Ids?.[0];
	return i && r.includes(i) ? i : r.find((e) => /mouth_?open_?y/i.test(e)) ?? null;
}
function B(e, t, n, r) {
	return (r ? Object.entries(r).map(([e, [t, n, r, i]]) => ({
		name: e,
		x: t,
		y: n,
		w: r,
		h: i
	})) : e.getHitAreaBounds()).filter((e) => t >= e.x && t <= e.x + e.w && n >= e.y && n <= e.y + e.h).sort((e, t) => e.w * e.h - t.w * t.h)[0]?.name ?? "default";
}
var V = {
	x: .5,
	y: .35
};
function ee(e, t) {
	let n = t.look ? t.look.anchor : void 0;
	if (n?.length === 2 && n.every((e) => Number.isFinite(e) && e >= 0 && e <= 1)) return {
		x: n[0],
		y: n[1]
	};
	let r = Object.entries(t.hitAreas ?? {}).find(([e]) => /head|face/i.test(e))?.[1], i = r ? {
		x: r[0],
		y: r[1],
		w: r[2],
		h: r[3]
	} : e.getHitAreaBounds().find((e) => /head|face/i.test(e.name));
	if (!i) return V;
	let a = i.x + i.w / 2, o = i.y + i.h / 2;
	return a >= 0 && a <= 1 && o >= 0 && o <= 1 ? {
		x: a,
		y: o
	} : V;
}
function H(e, t) {
	let n = N(e);
	if (!n) return () => {};
	if (t.look === !1) return n.release;
	let r = T(t.look), i = performance.now(), a = matchMedia("(prefers-reduced-motion: reduce)"), o = null, s = {
		x: 0,
		y: 0
	}, c = {
		x: 0,
		y: 0
	}, l = null, u = !1, d = null, f = 0, p = 0, m = 0, h = performance.now(), g = !1, _ = {
		x: 0,
		y: 0
	}, v = () => document.hidden, y = (u) => {
		if (f = 0, g) return;
		!o && u - i >= 1e3 && (o = ee(e, t));
		let p = o ?? V, m = e.getCanvas().getBoundingClientRect(), b = E(r, a.matches), x = l && !v() ? k(l.x - (m.left + p.x * m.width), m.top + p.y * m.height - l.y, m.width, m.height, b) : {
			head: _,
			eyes: _
		}, S = Math.min(64, Math.max(0, u - h));
		if (h = u, d && l) {
			let e = A(d.progress, S, d.duration);
			d.progress = e, s = j(d.head, x.head, e), c = j(d.eyes, x.eyes, e), e >= 1 && (d = null);
		} else {
			let e = l ? null : D(r, a.matches);
			s = M(s, x.head, S, e ?? b.headResponse), c = M(c, x.eyes, S, e ?? b.eyeResponse);
		}
		let C = Math.hypot(s.x - x.head.x, s.y - x.head.y), w = Math.hypot(c.x - x.eyes.x, c.y - x.eyes.y);
		!d && C < 5e-4 && w < 5e-4 ? (s = x.head, c = x.eyes) : f = requestAnimationFrame(y), n.apply(s, c);
	}, b = () => {
		f || g || (h = performance.now(), f = requestAnimationFrame(y));
	}, x = () => {
		l = null, d = null, clearTimeout(p), clearTimeout(m), b();
	}, S = () => {
		clearTimeout(p), r.idleDelay > 0 && (p = window.setTimeout(x, r.idleDelay));
	}, C = (e) => {
		e.pointerType === "touch" || v() || (u &&= (d = {
			progress: 0,
			duration: a.matches ? Math.min(r.reentryDuration, 180) : r.reentryDuration,
			head: { ...s },
			eyes: { ...c }
		}, !1), clearTimeout(m), l = {
			x: e.clientX,
			y: e.clientY
		}, S(), b());
	}, w = (e) => {
		e.pointerType === "touch" || e.relatedTarget || v() || (u = !0, l && (clearTimeout(p), clearTimeout(m), m = window.setTimeout(x, r.leaveDelay)));
	}, O = () => {
		u = !0, x();
	}, P = () => {
		u = !0, x(), v() && (cancelAnimationFrame(f), f = 0, s = _, c = _, n.apply(_, _));
	}, F = () => b(), I = document.documentElement;
	return window.addEventListener("pointermove", C, { passive: !0 }), I.addEventListener("pointerleave", w), I.addEventListener("pointerenter", C), window.addEventListener("blur", O), document.addEventListener("visibilitychange", P), a.addEventListener("change", F), () => {
		g = !0, window.removeEventListener("pointermove", C), I.removeEventListener("pointerleave", w), I.removeEventListener("pointerenter", C), window.removeEventListener("blur", O), document.removeEventListener("visibilitychange", P), a.removeEventListener("change", F), cancelAnimationFrame(f), clearTimeout(p), clearTimeout(m), n.release();
	};
}
function te(e) {
	let t = "";
	return () => {
		let n = e.getExpressions().filter((e) => e !== t), r = n[Math.floor(Math.random() * n.length)];
		r && e.setExpression(t = r);
	};
}
function ne(e, t, n) {
	if (/head|face/i.test(t) && e.getExpressions().length) {
		n();
		return;
	}
	let r = Object.keys(e.getMotions()).filter((e) => /tap/i.test(e)), i = r.find((e) => e.toLowerCase().includes(t.toLowerCase())) ?? r[0];
	i && e.playMotion(i, void 0, 3);
}
async function re(e, t, n, r, i) {
	let { init: a } = await F();
	if (i()) throw Error("stale");
	let o = a(I(e, n.width, n.height));
	try {
		let e = z(o, t, await L(o, t, r)), n = te(o), i = H(o, t);
		return {
			l2d: o,
			mouth: (t) => e && o.setParams(t === null ? {} : { [e]: t }),
			hitArea: (e, n) => B(o, e, n, t.hitAreas),
			tap: (e) => ne(o, e, n),
			hasExpressions: () => o.getExpressions().length > 0,
			dress: n,
			playMotion: (e, t) => o.playMotion(e, t, 3),
			snapshot: async () => o.getCanvas().toDataURL("image/png"),
			release: () => {
				i(), R(o);
			}
		};
	} catch (e) {
		throw R(o), e;
	}
}
// src/triggers.ts
var ie = 2;
function U(e) {
	let t = (e.getAttribute("aria-label") || e.getAttribute("title") || e.textContent || "").replace(/\s+/g, " ").trim();
	return t.length > 18 ? `${t.slice(0, 18)}…` : t;
}
function W(e, t) {
	if (!(t instanceof Element)) return null;
	for (let n of e) try {
		let e = t.closest(n.selector);
		if (e) return {
			el: e,
			tip: n
		};
	} catch {}
	return null;
}
function ae(e) {
	let t = new AbortController(), n = {
		signal: t.signal,
		passive: !0
	}, r = (t) => t.composedPath().includes(e.host), i = (t, n) => {
		t?.length && e.say(n ? n(_(t)) : _(t), ie);
	}, a = null;
	document.addEventListener("mouseover", (t) => {
		if (r(t)) return;
		let n = W(e.messages().hover, t.target);
		!n || n.el === a ? n || (a = null) : (a = n.el, e.say(v(n.tip.text).replace(/\{text\}/g, U(n.el)), ie));
	}, n), document.addEventListener("click", (t) => {
		if (r(t)) return;
		let n = W(e.messages().click, t.target);
		n && e.say(v(n.tip.text).replace(/\{text\}/g, U(n.el)), 3);
	}, n), document.addEventListener("copy", () => i(e.messages().copy), n);
	let o = 0;
	document.addEventListener("visibilitychange", () => {
		document.hidden ? o = Date.now() : o && Date.now() - o > 3e3 && i(e.messages().back);
	}, n);
	let s = 0, c = 0, l = () => {
		let t = Date.now();
		t - c < 1e3 || (c = t, clearTimeout(s), s = window.setTimeout(() => !document.hidden && i(e.messages().away), e.awayAfter));
	};
	for (let e of [
		"mousemove",
		"keydown",
		"scroll",
		"touchstart",
		"wheel"
	]) addEventListener(e, l, n);
	l();
	let u = !1, d = !1;
	return addEventListener("scroll", () => {
		d || (d = !0, requestAnimationFrame(() => {
			d = !1;
			let t = document.documentElement;
			if (t.scrollHeight < innerHeight * 1.5) return;
			let n = t.scrollHeight - (scrollY + innerHeight);
			n < 40 && !u ? (u = !0, i(e.messages().bottom)) : n > 300 && (u = !1);
		}));
	}, n), () => {
		t.abort(), clearTimeout(s);
	};
}
// src/kanban.ts
var G = {
	idle: 1,
	event: 2,
	tap: 3,
	say: 4,
	system: 5
}, oe = "https://v1.hitokoto.cn/?c=a&c=b&c=c&encode=json";
function K(a) {
	let s = {
		position: "left",
		size: 300,
		load: "idle",
		mobile: "hide",
		respectSaveData: !0,
		draggable: !0,
		remember: !0,
		storageKey: "kanban",
		transition: 800,
		tipDuration: 4500,
		idleInterval: 25e3,
		typingSpeed: 60,
		hitokoto: !0,
		theme: "auto",
		awayAfter: 9e4,
		zIndex: 9990,
		bubble: "glass",
		bubbleFloat: !1,
		status: "pill",
		...a
	}, l = Array.isArray(s.models) ? s.models : [s.models];
	if (!l.length) throw Error("[kanban] 至少需要配置一个模型");
	if (l.some((e) => !e.path && !e.puppet)) throw Error("[kanban] 每个模型都要有 path 或 puppet");
	let { width: d, height: p } = typeof s.size == "number" ? {
		width: s.size,
		height: s.size
	} : s.size, m = t(s.storageKey, s.remember), b = new e(), w = (e) => (Math.trunc(e) % l.length + l.length) % l.length, T = m.get("visits") ?? 0;
	try {
		sessionStorage.getItem(`${s.storageKey}:s`) || (m.set("visits", ++T), sessionStorage.setItem(`${s.storageKey}:s`, "1"));
	} catch {}
	let E = w(m.get("index") ?? 0), D = "waiting", O = null, k = 0, A = 0, j = 0, M = x(s.messages, l[E].messages), N = u(d, p, s.transition), { host: P, stage: F, status: I } = N;
	P.dataset.pos = s.position, P.dataset.bubble = s.bubble, P.dataset.status = s.status, s.entranceMotion === "slide" && (P.dataset.entrance = "slide"), s.exitMotion === "slide" && (P.dataset.exit = "slide"), s.bubbleFloat && (P.dataset.float = ""), s.draggable || (P.dataset.drag = "off"), P.style.setProperty("--kb-z", String(s.zIndex)), s.primaryColor && P.style.setProperty("--kb-primary", s.primaryColor), (s.parent ?? document.body).appendChild(P);
	let L = m.get("pos") ?? {
		x: 0,
		y: 0
	}, R = (e) => {
		L = e, P.style.setProperty("--kb-x", `${e.x}px`), P.style.setProperty("--kb-y", `${e.y}px`);
	};
	R(L);
	let z = new o(N.bubble, {
		typingSpeed: s.typingSpeed,
		duration: s.tipDuration,
		mouth: (e) => O?.mouth(e),
		onSay: (e) => b.emit("say", e)
	});
	function B(e, t = G.say, n) {
		if (D !== "active") return !1;
		let r = C(v(e), {
			name: l[E].name ?? "我",
			visits: T
		});
		return z.show(r, t, n);
	}
	async function V() {
		try {
			let e = new AbortController();
			setTimeout(() => e.abort(), 2500);
			let t = typeof s.hitokoto == "string" ? s.hitokoto : oe, n = await (await fetch(t, { signal: e.signal })).json();
			return n.hitokoto ? `${n.hitokoto}${n.from ? ` ——「${n.from}」` : ""}` : null;
		} catch {
			return null;
		}
	}
	async function ee() {
		if (s.hitokoto && Math.random() < .4) {
			let e = await V();
			if (e) return e;
		}
		return _(M.idle);
	}
	let H = () => clearInterval(A);
	function te() {
		H(), s.idleInterval && M.idle.length && (A = window.setInterval(async () => {
			D === "active" && !document.hidden && !z.speaking && B(await ee(), G.idle);
		}, s.idleInterval));
	}
	function ne() {
		return S(M.dates) || (M.welcome.length ? _(M.welcome) : T > 1 && Math.random() < .4 ? `欢迎回来!这是你第 ${T} 次来这里啦~` : y());
	}
	function ie() {
		if (s.menu === !1) return;
		let e = new Set(s.menu?.hide ?? []), t = [
			{
				id: "talk",
				label: "说句话",
				icon: c.talk,
				onClick: async () => B(await ee())
			},
			{
				id: "dress",
				label: "换个表情",
				icon: c.dress,
				onClick: () => J.dress()
			},
			{
				id: "switch",
				label: "换个角色",
				icon: c.switch,
				onClick: () => void J.switchModel()
			},
			{
				id: "photo",
				label: "拍张照",
				icon: c.photo,
				onClick: () => J.photo()
			},
			{
				id: "sleep",
				label: "休息一下",
				icon: c.sleep,
				onClick: () => void J.sleep()
			},
			{
				id: "about",
				label: "关于",
				icon: c.about,
				onClick: () => window.open(s.aboutUrl, "_blank", "noopener")
			}
		].filter((t) => e.has(t.id) ? !1 : t.id === "dress" ? !!O?.hasExpressions() : t.id === "switch" ? l.length > 1 : t.id !== "about" || !!s.aboutUrl);
		t.push(...s.menu?.extra ?? []), N.menu.replaceChildren(...t.map((e) => {
			let t = document.createElement("button");
			return t.type = "button", t.innerHTML = e.icon, t.setAttribute("aria-label", e.label), t.addEventListener("click", () => e.onClick(J)), t;
		}));
	}
	function U() {
		O?.release(), O = null;
	}
	async function W(e) {
		let t = ++k;
		U(), D = "loading", I.show("看板娘赶来中…", "busy");
		let n = l[E];
		try {
			let r = {
				width: d,
				height: p
			}, i = n.puppet ? await n.puppet(F, r) : await re(F, {
				...n,
				path: n.path ?? ""
			}, r, (e, n) => {
				t === k && I.text(`看板娘赶来中… ${Math.round(e / n * 100)}%`), b.emit("progress", e, n);
			}, () => t !== k);
			if (t !== k) {
				i.release();
				return;
			}
			O = i, ie(), D = "active", I.hide(), F.offsetHeight, F.classList.add("on"), b.emit("ready", n, E);
			let a = e === "wake" ? _(["我睡醒啦~", "休息好了,继续陪你~"]) : e === "switch" ? _(["换我来陪你啦~", "当当~我来啦!"]) : ne();
			setTimeout(() => t === k && B(a, G.system), s.transition * .7), te();
		} catch (r) {
			if (t !== k) return;
			U(), D = "error";
			let i = r instanceof Error ? r : Error(String(r));
			console.warn("[kanban] 模型加载失败:", n.path, i), I.show("加载失败,点我重试", "error", () => void W(e)), b.emit("error", i);
		}
	}
	async function K() {
		H(), z.hide();
		let e = F.classList.contains("on");
		F.classList.remove("on", "menu-open"), e && await n(s.transition);
	}
	function q(e) {
		if (D !== "active" || !O) return;
		e.pointerType === "touch" && (F.classList.toggle("menu-open"), clearTimeout(j), j = window.setTimeout(() => F.classList.remove("menu-open"), 4e3));
		let t = F.getBoundingClientRect(), n = O.hitArea((e.clientX - t.left) / t.width, (e.clientY - t.top) / t.height);
		b.emit("tap", n), O.tap(n), B(M.tap[n] ?? M.tap.default ?? [], G.tap);
	}
	let J = {
		get state() {
			return D;
		},
		get index() {
			return E;
		},
		get model() {
			return l[E];
		},
		get l2d() {
			return O?.l2d ?? null;
		},
		on: (e, t) => b.on(e, t),
		say: (e, t) => void B(e, t?.priority ?? G.say, t?.duration),
		async load() {
			(D === "waiting" || D === "error") && await W("first");
		},
		async sleep() {
			D !== "sleeping" && D !== "destroyed" && (k++, D = "sleeping", m.set("sleeping", !0), await K(), D === "sleeping" && (U(), I.show("看板娘休息中 · 点我唤醒", "rest", () => void J.wake()), b.emit("sleep")));
		},
		async wake() {
			(D === "sleeping" || D === "waiting") && (m.set("sleeping", !1), b.emit("wake"), await W("wake"));
		},
		async switchModel(e) {
			if (D === "destroyed" || D === "loading") return;
			let t = w(e ?? E + 1);
			(t !== E || D !== "active") && (await K(), E = t, m.set("index", E), m.set("sleeping", !1), M = x(s.messages, l[E].messages), b.emit("switch", E), await W("switch"));
		},
		dress() {
			O?.hasExpressions() && (O.dress(), B([
				"换个表情~",
				"这样好看吗?",
				"嘿嘿,变身!"
			]));
		},
		playMotion(e, t) {
			O?.playMotion(e, t);
		},
		photo() {
			O && O.snapshot().then((e) => {
				if (!e) throw Error("empty");
				let t = document.createElement("a");
				t.href = e, t.download = `${l[E].name ?? "kanban"}-${Date.now()}.png`, t.click(), B("咔嚓!照片已经保存啦~");
			}).catch(() => B("拍照失败了…模型图片不允许跨域截图"));
		},
		resetPosition() {
			R({
				x: 0,
				y: 0
			}), m.set("pos", void 0);
		},
		async destroy() {
			D !== "destroyed" && (k++, await K(), Y.forEach((e) => e()), U(), P.remove(), D = "destroyed", b.clear());
		}
	}, Y = [
		f(P, s.theme),
		ae({
			host: P,
			awayAfter: s.awayAfter,
			messages: () => M,
			say: (e, t) => void B(e, t)
		}),
		g({
			stage: F,
			side: s.position,
			enabled: s.draggable,
			getPos: () => L,
			setPos: R,
			onEnd: (e) => m.set("pos", e),
			onTap: q
		}),
		H
	], X = 0, se = () => {
		clearTimeout(X), X = window.setTimeout(() => R(h(L, F)), 200);
	};
	addEventListener("resize", se), Y.push(() => removeEventListener("resize", se));
	let Z = matchMedia("(max-width: 767px)"), Q = () => !(s.mobile === "hide" && Z.matches), $ = () => {
		Q() ? P.hidden && (P.hidden = !1, ce()) : (k++, H(), z.hide(), F.classList.remove("on"), U(), I.hide(), P.hidden = !0, D !== "sleeping" && (D = "waiting"));
	};
	Z.addEventListener("change", $), Y.push(() => Z.removeEventListener("change", $));
	function ce() {
		Q() ? m.get("sleeping") ? (D = "sleeping", I.show("看板娘休息中 · 点我唤醒", "rest", () => void J.wake())) : s.load === "manual" || s.respectSaveData && i() ? I.show("召唤看板娘", "summon", () => void J.load()) : s.load === "immediate" ? W("first") : r(() => D === "waiting" && void W("first")) : P.hidden = !0;
	}
	return ce(), J;
}
// src/puppets/xingtang-art.ts
function q(e, t, n, r = .45) {
	let i = [];
	for (let a = 0; a < 10; a++) {
		let o = -Math.PI / 2 + a * Math.PI / 5, s = a % 2 ? n * r : n;
		i.push(`${(e + Math.cos(o) * s).toFixed(1)} ${(t + Math.sin(o) * s).toFixed(1)}`);
	}
	return `M${i.join("L")}Z`;
}
var J = "stroke=\"#2f6f5d\" stroke-width=\"1.6\" stroke-linejoin=\"round\"", Y = "stroke=\"#141a38\" stroke-width=\"1.6\" stroke-linejoin=\"round\"", X = (e) => `
  <g id="${e}">
    <g class="open">
      <ellipse rx="12" ry="14" fill="#fff"/>
      <g clip-path="url(#clip-${e})">
        <g class="iris">
          <ellipse rx="10" ry="12.5" fill="url(#g-iris)"/>
          <ellipse cy="1.5" rx="4.6" ry="6" fill="#5a2a0c"/>
          <circle cx="-4" cy="-5" r="3.4" fill="#fff"/>
          <circle cx="4.2" cy="4.6" r="1.7" fill="#fff" opacity=".85"/>
        </g>
      </g>
      <path d="M-13 -9 Q-1 -19 13 -10" fill="none" stroke="#3d2614" stroke-width="3.2" stroke-linecap="round"/>
      <path d="M-7 13.5 Q0 15.5 7 13.5" fill="none" stroke="#c98f74" stroke-width="1.2" stroke-linecap="round"/>
    </g>
    <path class="lidline" d="M-13 -2 Q0 -6 13 -3" fill="none" stroke="#3d2614" stroke-width="3.2" stroke-linecap="round"/>
    <path class="closed" d="M-12 2 Q0 7 12 2" fill="none" stroke="#3d2614" stroke-width="3" stroke-linecap="round"/>
    <path class="happy" d="M-11 4 Q0 -8 11 4" fill="none" stroke="#3d2614" stroke-width="3.2" stroke-linecap="round"/>
    <clipPath id="clip-${e}"><ellipse rx="12" ry="14"/></clipPath>
  </g>`, se = `
<svg class="actor" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="见习魔女星糖">
<defs>
  <linearGradient id="g-hair" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#c8f5e3"/><stop offset=".55" stop-color="#93dcc2"/><stop offset="1" stop-color="#6cc2a5"/>
  </linearGradient>
  <radialGradient id="g-face" cx=".5" cy=".42" r=".62">
    <stop offset="0" stop-color="#fff7f2"/><stop offset="1" stop-color="#ffe4d8"/>
  </radialGradient>
  <radialGradient id="g-iris" cx=".5" cy=".7" r=".7">
    <stop offset="0" stop-color="#ffe08a"/><stop offset=".5" stop-color="#f3a73c"/><stop offset="1" stop-color="#a5561a"/>
  </radialGradient>
  <linearGradient id="g-hat" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#3a4886"/><stop offset="1" stop-color="#202a5a"/>
  </linearGradient>
  <linearGradient id="g-cape" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#3d4a8c"/><stop offset="1" stop-color="#2a3468"/>
  </linearGradient>
</defs>
<g id="all">
  <g id="body">
    <rect x="132" y="279" width="17" height="13" rx="6" fill="#7a5240"/>
    <rect x="151" y="279" width="17" height="13" rx="6" fill="#7a5240"/>
    <rect x="137" y="262" width="9" height="20" fill="#f4f1fa"/>
    <rect x="154" y="262" width="9" height="20" fill="#f4f1fa"/>
    <path d="M122 234 L178 234 L194 270 Q150 281 106 270 Z" fill="url(#g-cape)" ${Y}/>
    <path d="M108 267 Q150 278 192 267" fill="none" stroke="#f2c65a" stroke-width="2.4"/>
    <path d="M129 198 L171 198 L177 240 L123 240 Z" fill="#fff6e6" stroke="#d8c7a8" stroke-width="1.4"/>
    <g id="armL">
      <path d="M118 210 Q103 228 105 246 Q112 251 118 246 Q119 230 126 219 Z" fill="#fff6e6" stroke="#d8c7a8" stroke-width="1.4"/>
      <circle cx="111" cy="250" r="6.5" fill="#ffe9de" stroke="#d9a898" stroke-width="1.2"/>
    </g>
    <g id="armR">
      <path d="M182 210 Q197 228 195 246 Q188 251 182 246 Q181 230 174 219 Z" fill="#fff6e6" stroke="#d8c7a8" stroke-width="1.4"/>
      <path d="M190 250 L210 222" stroke="#8a5a3c" stroke-width="3.4" stroke-linecap="round"/>
      <path d="${q(212, 219, 8)}" fill="#ffd56a" stroke="#c99a2e" stroke-width="1.2"/>
      <circle cx="189" cy="250" r="6.5" fill="#ffe9de" stroke="#d9a898" stroke-width="1.2"/>
    </g>
    <path d="M116 206 C121 196 134 192 150 194 C166 192 179 196 184 206 L191 226 Q170 235 150 231 Q130 235 109 226 Z" fill="url(#g-cape)" ${Y}/>
    <path d="M110 226 Q130 235 150 231 Q170 235 190 226" fill="none" stroke="#f2c65a" stroke-width="2.6"/>
    <path d="M150 205 L137 197 L138 212 Z M150 205 L163 197 L162 212 Z" fill="#7fd8b8" stroke="#2f6f5d" stroke-width="1.2"/>
    <circle cx="150" cy="205" r="3.6" fill="#5fc2a0" stroke="#2f6f5d" stroke-width="1.2"/>
    <circle cx="150" cy="216" r="4.8" fill="#ffd56a" stroke="#c99a2e" stroke-width="1.2"/>
    <path d="M147.5 217.5 L152.5 217.5" stroke="#9c7420" stroke-width="1.2"/>
  </g>
  <g id="head">
    <g id="hairBack">
      <path d="M92 150 C88 104 118 80 150 80 C182 80 212 104 208 150 C207 172 204 190 211 204 C197 207 188 201 184 196 L116 196 C112 201 103 207 89 204 C96 190 93 172 92 150 Z" fill="url(#g-hair)" ${J}/>
    </g>
    <g id="hatBack"><ellipse cx="150" cy="104" rx="88" ry="17" fill="#1b234c"/></g>
    <rect x="141" y="184" width="18" height="16" fill="#f6d6c8"/>
    <path id="face" d="M104 140 C104 112 196 112 196 140 C196 168 177 192 150 194 C123 192 104 168 104 140 Z" fill="url(#g-face)" stroke="#d9a898" stroke-width="1.4"/>
    <g id="cheeks" opacity=".3">
      <ellipse cx="122" cy="171" rx="9" ry="5" fill="#ff9db4"/>
      <ellipse cx="178" cy="171" rx="9" ry="5" fill="#ff9db4"/>
      <path d="M117 172 l3 -4 M122 172 l3 -4 M173 172 l3 -4 M178 172 l3 -4" stroke="#ff7f9c" stroke-width="1.2" stroke-linecap="round"/>
    </g>
    <g transform="translate(128 154)">${X("eyeL")}</g>
    <g transform="translate(172 154)">${X("eyeR")}</g>
    <path id="browL" d="M118 128 Q128 124 138 127" fill="none" stroke="#2f6f5d" stroke-width="2.4" stroke-linecap="round"/>
    <path id="browR" d="M162 127 Q172 124 182 128" fill="none" stroke="#2f6f5d" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M149 167 L151.5 168" stroke="#d9a898" stroke-width="1.6" stroke-linecap="round"/>
    <g id="mouth" transform="translate(150 179)">
      <path class="smile" d="M-6 -1 Q0 4 6 -1" fill="none" stroke="#b5566c" stroke-width="2.2" stroke-linecap="round"/>
      <path class="smug" d="M-6 0 Q1 3 7 -3" fill="none" stroke="#b5566c" stroke-width="2.2" stroke-linecap="round"/>
      <path class="pout" d="M-4 1.5 Q0 -2 4 1.5" fill="none" stroke="#b5566c" stroke-width="2.2" stroke-linecap="round"/>
      <g class="open"><ellipse rx="5.2" ry="5" fill="#a8455d"/><ellipse cy="2.4" rx="3.2" ry="2" fill="#ff8fa3"/></g>
    </g>
    <path id="lockL" d="M101 136 C95 158 97 180 104 198 C109 186 111 166 109 144 Z" fill="url(#g-hair)" ${J}/>
    <path id="lockR" d="M199 136 C205 158 203 180 196 198 C191 186 189 166 191 144 Z" fill="url(#g-hair)" ${J}/>
    <g id="bangs">
      <path d="M100 146 C96 112 120 92 150 92 C180 92 204 112 200 146 C194 136 190 128 186 124 Q182 138 176 142 Q172 128 164 120 Q160 136 150 140 Q142 128 136 118 Q132 134 122 140 Q118 128 114 124 C108 130 104 138 100 146 Z" fill="url(#g-hair)" ${J}/>
      <path d="M120 106 Q150 97 180 106" fill="none" stroke="#effff8" stroke-width="3" stroke-linecap="round" opacity=".75"/>
      <path d="${q(113, 128, 7.5)}" fill="#ffd56a" stroke="#c99a2e" stroke-width="1.2"/>
    </g>
    <g id="hat">
      <path d="M106 100 C112 70 126 46 150 34 C170 24 190 20 206 28 C194 30 182 38 178 52 C174 70 186 88 194 100 Z" fill="url(#g-hat)" ${Y}/>
      <path d="M107 96 C130 104 170 104 193 96 L191 84 C170 92 130 92 110 84 Z" fill="#5a4aa8" ${Y}/>
      <path d="${q(130, 92, 3.4)} ${q(150, 95, 3.8)} ${q(170, 92, 3.4)}" fill="#ffd56a"/>
      <path d="M62 102 A88 17 0 0 0 238 102 A88 8 0 0 1 62 102 Z" fill="url(#g-hat)" ${Y}/>
      <g id="charm">
        <path d="M206 28 L211 44" stroke="#f2c65a" stroke-width="1.3"/>
        <path d="M211 44 A8 8 0 1 0 219 52 A6 6 0 1 1 211 44 Z" fill="#ffd56a" stroke="#c99a2e" stroke-width="1"/>
      </g>
    </g>
  </g>
  <g id="fx"></g>
</g>
</svg>`, Z = [
	"happy",
	"smug",
	"surprised",
	"pout",
	"shy"
], Q = (e, t) => e + Math.random() * (t - e), $ = (e) => Math.max(-1, Math.min(1, e));
function ce(e, t) {
	let n = document.createElement("template");
	n.innerHTML = t.trim();
	let r = n.content.firstElementChild, i = e.querySelector(".actor");
	i ? i.replaceWith(r) : e.prepend(r);
	let a = (e) => r.querySelector(e), o = (e, t) => e.setAttribute("transform", t), s = (e, t) => e.style.display = t ? "" : "none", c = Object.fromEntries([
		"all",
		"body",
		"head",
		"hairBack",
		"hatBack",
		"hat",
		"charm",
		"lockL",
		"lockR",
		"bangs",
		"armL",
		"armR",
		"cheeks",
		"browL",
		"browR",
		"fx"
	].map((e) => [e, a(`#${e}`)])), l = ["#eyeL", "#eyeR"].map((e) => ({
		open: a(`${e} .open`),
		iris: a(`${e} .iris`),
		lid: a(`${e} .lidline`),
		closed: a(`${e} .closed`),
		happy: a(`${e} .happy`)
	})), u = {
		smile: a("#mouth .smile"),
		smug: a("#mouth .smug"),
		pout: a("#mouth .pout"),
		open: a("#mouth .open")
	}, d = matchMedia("(prefers-reduced-motion: reduce)").matches ? .3 : 1, f = performance.now(), p = () => (performance.now() - f) / 1e3, m = 0, h = 0, g = {
		x: 0,
		y: 0
	}, _ = {
		x: 0,
		y: 0
	}, v = -10, y = 0, b = Q(1.5, 3), x = -1, S = "normal", C = 0, w = null, T = null, E = [];
	function D() {
		let e = S === "happy";
		l.forEach((t) => {
			s(t.happy, e), s(t.lid, S === "smug");
		});
		let t = w !== null || e || S === "surprised" ? "open" : S === "smug" ? "smug" : S === "pout" ? "pout" : "smile";
		for (let [e, n] of Object.entries(u)) s(n, e === t);
		let n = w ?? (e ? .45 : S === "surprised" ? .75 : 0);
		o(u.open, `scale(${.8 + n * .3} ${.25 + n * 1.05})`);
		let r = {
			normal: .3,
			happy: .6,
			smug: .35,
			surprised: .3,
			pout: .6,
			shy: .95
		}[S];
		c.cheeks.setAttribute("opacity", String(r));
		let i = {
			pout: [
				12,
				-12,
				0
			],
			surprised: [
				0,
				0,
				-4
			],
			shy: [
				-8,
				8,
				0
			],
			smug: [
				0,
				-6,
				-1
			]
		}[S] ?? [
			0,
			0,
			0
		];
		o(c.browL, `translate(0 ${i[2]}) rotate(${i[0]} 128 126)`), o(c.browR, `translate(0 ${i[2]}) rotate(${i[1]} 172 126)`);
	}
	function O(e, t = 0) {
		S = e, C = p() + t, D();
	}
	function k(e, t) {
		T = {
			name: e,
			start: p(),
			dur: t
		};
	}
	function A(e, t, n = 10) {
		for (let r = 0; r < n; r++) {
			let n = document.createElementNS("http://www.w3.org/2000/svg", "path");
			n.setAttribute("d", q(0, 0, Q(3, 6))), n.setAttribute("fill", Math.random() < .5 ? "#ffd56a" : "#9ff0d4"), c.fx.appendChild(n), E.push({
				el: n,
				x: e,
				y: t,
				vx: Q(-1.6, 1.6),
				vy: Q(-2.6, -.6),
				life: 1
			});
		}
	}
	function j() {
		let e = p(), t = Math.min(e - h, .1) * 60;
		h = e, e - v > 4 && e > y && (_.x = Q(-.6, .6), _.y = Q(-.3, .4), y = e + Q(2, 4));
		let n = S === "shy" ? -.35 : _.x, r = S === "shy" ? .7 : _.y, i = 1 - .92 ** t;
		g.x += (n - g.x) * i, g.y += (r - g.y) * i;
		let a = 0, u = 0, f = 0, w = 0;
		if (T) {
			let t = (e - T.start) / T.dur;
			if (t >= 1) T = null;
			else {
				let e = Math.sin(Math.PI * t);
				T.name === "Hat" && (a = -14 * e), T.name === "Body" && (u = -16 * e), T.name === "Head" && (f = Math.sin(t * Math.PI * 6) * 5 * (1 - t)), T.name === "Magic" && (w = -38 * e);
			}
		}
		let D = Math.sin(e * 2 * Math.PI / 3.4) * d;
		o(c.all, `translate(0 ${u})`), o(c.body, `translate(150 292) scale(1 ${1 + D * .01}) translate(-150 -292)`), o(c.head, `translate(${g.x * 2} ${-D * 1.2 + g.y * 1.5}) rotate(${g.x * 5 + f} 150 196)`), o(c.hairBack, `rotate(${Math.sin(e * 1.6) * .8 * d - g.x * 1.5} 150 110)`), o(c.lockL, `rotate(${Math.sin(e * 2.2) * 3 * d - g.x * 3} 105 140)`), o(c.lockR, `rotate(${Math.sin(e * 2.2 + 1) * 3 * d - g.x * 3} 195 140)`), o(c.bangs, `translate(${g.x * 1.2} ${g.y * .6})`);
		let k = `translate(${g.x * 1.5} ${a}) rotate(${-6 + g.x * 2 + (a ? Math.sin(e * 22) * 3 : 0)} 150 100)`;
		o(c.hat, k), o(c.hatBack, k), o(c.charm, `rotate(${Math.sin(e * 2.6) * 10 * d - g.x * 10} 206 28)`), o(c.armR, `rotate(${Math.sin(e * 1.3) * 3 * d + w} 182 212)`), o(c.armL, `rotate(${-Math.sin(e * 1.3) * 2 * d} 118 212)`);
		let A = 1;
		if (x < 0 && e > b && (x = e), x >= 0) {
			let t = (e - x) / .16;
			t >= 1 ? (x = -1, b = Math.random() < .2 ? e + .12 : e + Q(2.5, 5.5)) : A = Math.abs(Math.cos(Math.PI * t));
		}
		let M = (S === "smug" ? .5 : 1) * A;
		l.forEach((e) => {
			let t = S === "happy";
			s(e.open, !t), s(e.closed, !t && A < .3), o(e.open, `translate(0 4) scale(1 ${Math.max(M, .05)}) translate(0 -4)`), o(e.iris, `translate(${g.x * 3.5} ${g.y * 2.5}) scale(${S === "surprised" ? .82 : 1})`);
		}), S !== "normal" && C && e > C && O("normal");
		for (let e = E.length - 1; e >= 0; e--) {
			let n = E[e];
			n.x += n.vx * t, n.y += n.vy * t, n.vy += .05 * t, n.life -= .022 * t, o(n.el, `translate(${n.x} ${n.y}) rotate(${n.life * 360})`), n.el.setAttribute("opacity", String(Math.max(n.life, 0))), n.life <= 0 && (n.el.remove(), E.splice(e, 1));
		}
		m = requestAnimationFrame(j);
	}
	let M = (e) => {
		let t = r.getBoundingClientRect();
		_.x = $((e.clientX - (t.left + t.width / 2)) / (innerWidth / 2)), _.y = $((e.clientY - (t.top + t.height / 2)) / (innerHeight / 2)), v = p();
	};
	return document.addEventListener("pointermove", M, { passive: !0 }), D(), m = requestAnimationFrame(j), {
		mouth(e) {
			w = e, D();
		},
		hitArea(e, t) {
			let n = r.getBoundingClientRect(), i = r.getRootNode().elementFromPoint(n.left + e * n.width, n.top + t * n.height);
			return i?.closest("#hat, #hatBack") ? "Hat" : i?.closest("#head") ? "Head" : i?.closest("#body") ? "Body" : "default";
		},
		tap(e) {
			e === "Hat" ? (k("Hat", .6), O("surprised", 1.6), A(212, 50, 8)) : e === "Head" ? (k("Head", 1.1), O("happy", 2.5)) : e === "Body" && (k("Body", .5), O("pout", 2.2));
		},
		hasExpressions: () => !0,
		dress() {
			k("Magic", .9), setTimeout(() => A(214, 196, 14), 300);
			let e = Z.filter((e) => e !== S);
			O(e[Math.floor(Math.random() * e.length)], 6);
		},
		playMotion: (e) => k(e, e === "Head" ? 1.1 : e === "Magic" ? .9 : .6),
		async snapshot() {
			let e = new Image();
			e.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(r))}`, await e.decode();
			let t = document.createElement("canvas");
			return t.width = t.height = 600, t.getContext("2d").drawImage(e, 0, 0, 600, 600), t.toDataURL("image/png");
		},
		release() {
			cancelAnimationFrame(m), document.removeEventListener("pointermove", M), r.remove();
		}
	};
}
// src/puppets/xingtang.ts
var le = (e) => ce(e, se), ue = {
	welcome: ["欢迎光临!我是见习魔女星糖,今天也请多指教~", "咦,有客人!等等,我先把帽子戴正……好了!"],
	idle: [
		"师父说魔法要每天练习……可是好想偷懒哦",
		"要不要看我变个小星星?虽然只成功过三次",
		"这个博客的文章,我都偷偷读过了哦",
		"帽子上的月亮吊坠,是我第一次考试的奖品!",
		"累了就休息一下吧,魔力也是要恢复的~"
	],
	tap: {
		Hat: ["帽子不可以乱碰啦!会掉下来的!", "哇!差点飞走了……"],
		Head: ["嘿嘿,被摸头了~", "再摸的话……魔力会满出来的!"],
		Body: ["不要戳我啦!", "呜,好痒……"],
		default: ["嗯?找我有事吗?", "要不要一起去冒险?"]
	},
	copy: ["复制好啦!记得写上出处,不然师父会生气的"],
	back: ["你回来啦!我刚刚练习了一个新咒语~"],
	away: ["你还在吗?我数到三你不出现,我就要变出星星了哦"],
	bottom: ["全部看完了!奖励你一颗星星糖 ⭐"]
};
export { K as createKanban, y as greeting, le as xingtang, ue as xingtangMessages };
