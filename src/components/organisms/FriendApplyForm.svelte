<script lang="ts">
/**
 * 友链申请表单(本站新增,不是主题文件)。
 * 填写 → Turnstile 人机验证 → 提交给本站的接口 /api/friend-apply(src/friends/handler.js)→ 接口发邮件给博主。
 * 配置见 src/friends/config.js;没配置时由 FriendSection 决定不渲染本组件。
 */
import Button from "@components/atoms/action/Button.svelte";
import TextField from "@components/atoms/input/TextField.svelte";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import Icon from "@iconify/svelte";
import { onMount } from "svelte";
import { friendApplyConfig } from "../../friends/config";
import { FIELDS, LIMITS, validateApplication } from "../../friends/validate";

type Field = "name" | "url" | "avatar" | "desc" | "email";
type FieldError = "required" | "too_long" | "url" | "email";
type Status = "idle" | "sending" | "success" | "error";

const TURNSTILE_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

const fields: { key: Field; label: I18nKey; type: string; autocomplete: string }[] = [
	{ key: "name", label: I18nKey.friendApplyName, type: "text", autocomplete: "off" },
	{ key: "url", label: I18nKey.friendApplyUrl, type: "url", autocomplete: "url" },
	{ key: "avatar", label: I18nKey.friendApplyAvatar, type: "url", autocomplete: "off" },
	{ key: "desc", label: I18nKey.friendApplyDesc, type: "text", autocomplete: "off" },
	{ key: "email", label: I18nKey.friendApplyEmail, type: "email", autocomplete: "email" },
];

const errorText: Record<FieldError, I18nKey> = {
	required: I18nKey.friendApplyErrorRequired,
	too_long: I18nKey.friendApplyErrorTooLong,
	url: I18nKey.friendApplyErrorUrl,
	email: I18nKey.friendApplyErrorEmail,
};

let values = $state<Record<Field, string>>({ name: "", url: "", avatar: "", desc: "", email: "" });
let errors = $state<Partial<Record<Field, FieldError>>>({});
/** 蜜罐:真人看不到,机器人会填 */
let website = $state("");
let status = $state<Status>("idle");
let message = $state("");
let token = "";
let widgetId: string | undefined;
let captchaEl: HTMLDivElement | undefined = $state();

function fieldError(key: Field) {
	const code = errors[key];
	if (!code) return "";
	return i18n(errorText[code]).replace("{max}", String(LIMITS[key]));
}

function loadTurnstile(): Promise<void> {
	if (window.turnstile) return Promise.resolve();
	return new Promise((resolve, reject) => {
		let script = document.querySelector<HTMLScriptElement>("script[data-friend-apply-turnstile]");
		if (!script) {
			script = document.createElement("script");
			script.src = TURNSTILE_SRC;
			script.async = true;
			script.dataset.friendApplyTurnstile = "";
			document.head.appendChild(script);
		}
		script.addEventListener("load", () => resolve(), { once: true });
		script.addEventListener("error", () => reject(new Error("turnstile")), { once: true });
		if (window.turnstile) resolve();
	});
}

function resetCaptcha() {
	token = "";
	if (widgetId !== undefined) window.turnstile?.reset(widgetId);
}

function fail(key: I18nKey) {
	status = "error";
	message = i18n(key);
}

async function submit(event: SubmitEvent) {
	event.preventDefault();
	if (status === "sending") return;
	const checked = validateApplication(values);
	errors = checked.errors as Partial<Record<Field, FieldError>>;
	if (Object.keys(errors).length > 0) {
		status = "idle";
		message = "";
		const first = FIELDS.find((key) => errors[key as Field]);
		document.getElementById(`friend-apply-${first}`)?.focus();
		return;
	}
	if (!token) return fail(I18nKey.friendApplyErrorCaptcha);

	status = "sending";
	message = "";
	try {
		const response = await fetch(friendApplyConfig.api, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ ...checked.values, website, token }),
		});
		const result = await response.json().catch(() => ({}));
		if (response.ok && result.ok) {
			status = "success";
			message = i18n(I18nKey.friendApplySuccess);
			values = { name: "", url: "", avatar: "", desc: "", email: "" };
			resetCaptcha();
			return;
		}
		// 人机验证的凭证只能用一次,不管哪种失败都要换新的
		resetCaptcha();
		if (result.error === "invalid" && result.fields) {
			errors = result.fields;
			status = "idle";
		} else if (result.error === "captcha") fail(I18nKey.friendApplyErrorCaptcha);
		else if (response.status === 429) fail(I18nKey.friendApplyErrorRateLimited);
		else fail(I18nKey.friendApplyErrorFailed);
	} catch {
		resetCaptcha();
		fail(I18nKey.friendApplyErrorFailed);
	}
}

onMount(() => {
	let disposed = false;
	loadTurnstile()
		.then(() => {
			if (disposed || !captchaEl || !window.turnstile) return;
			widgetId = window.turnstile.render(captchaEl, {
				sitekey: friendApplyConfig.siteKey,
				theme: document.documentElement.classList.contains("dark") ? "dark" : "light",
				// 只记下凭证,不清提示:提交失败后验证码会自动刷新,清了访客就看不到失败原因
				callback: (value: string) => (token = value),
				"expired-callback": () => (token = ""),
				"error-callback": () => {
					token = "";
					return true;
				},
			});
		})
		.catch(() => fail(I18nKey.friendApplyErrorCaptcha));
	return () => {
		disposed = true;
		if (widgetId !== undefined) window.turnstile?.remove(widgetId);
	};
});
</script>

<section class="friend-apply" aria-labelledby="friend-apply-title">
	<h2 id="friend-apply-title" class="friend-apply__title">
		<Icon icon="material-symbols:add-link-rounded" aria-hidden="true" />
		<span>{i18n(I18nKey.friendApplyTitle)}</span>
	</h2>
	<p class="friend-apply__hint">{i18n(I18nKey.friendApplyHint)}</p>

	<form class="friend-apply__form" novalidate onsubmit={submit}>
		{#each fields as field (field.key)}
			<div class="friend-apply__field" class:friend-apply__field--wide={field.key === "desc"}>
				<TextField
					id={`friend-apply-${field.key}`}
					name={field.key}
					type={field.type}
					label={i18n(field.label)}
					autocomplete={field.autocomplete}
					bind:value={values[field.key]}
					error={fieldError(field.key)}
					disabled={status === "sending"}
					oninput={() => {
						if (errors[field.key]) errors = { ...errors, [field.key]: undefined };
					}}
				/>
			</div>
		{/each}

		<div class="friend-apply__trap" aria-hidden="true">
			<input type="text" name="website" tabindex="-1" autocomplete="off" bind:value={website} />
		</div>

		<div class="friend-apply__captcha" bind:this={captchaEl}></div>

		<div class="friend-apply__actions">
			<Button
				type="submit"
				icon="material-symbols:send-outline-rounded"
				label={i18n(status === "sending" ? I18nKey.friendApplySending : I18nKey.friendApplySubmit)}
				disabled={status === "sending"}
			/>
			<p
				class="friend-apply__message"
				class:friend-apply__message--error={status === "error"}
				class:friend-apply__message--success={status === "success"}
				role="status"
				aria-live="polite"
			>{message}</p>
		</div>
	</form>
</section>

<style lang="stylus">
@import "../../styles/breakpoints.styl"

.friend-apply
	margin-top: 2rem
	padding-top: 1.5rem
	border-top: 1px solid var(--outline-variant)

	&__title
		display: flex
		align-items: center
		gap: 0.5rem
		margin: 0
		color: var(--on-surface)
		font: var(--m3e-type-title-large)
		> :global(svg)
			flex: none
			width: 1.5rem
			height: 1.5rem
			color: var(--primary)

	&__hint
		margin: 0.5rem 0 1.25rem
		color: var(--on-surface-variant)
		font: var(--m3e-type-body-medium)

	&__form
		display: grid
		grid-template-columns: 1fr
		gap: 1.75rem 1rem

		@media (min-width: bp-md)
			grid-template-columns: repeat(2, 1fr)

	&__field
		min-width: 0

	&__field--wide,
	&__captcha,
	&__actions
		grid-column: 1 / -1

	/* 蜜罐输入框:移出画面,真人和读屏软件都碰不到 */
	&__trap
		position: absolute
		left: -9999px
		width: 1px
		height: 1px
		overflow: hidden

	&__captcha
		min-height: 65px

	&__actions
		display: flex
		flex-wrap: wrap
		align-items: center
		gap: 0.75rem 1rem

	&__message
		margin: 0
		min-height: 1.25rem
		color: var(--on-surface-variant)
		font: var(--m3e-type-body-medium)

		&--error
			color: var(--error)

		&--success
			color: var(--primary)
</style>
