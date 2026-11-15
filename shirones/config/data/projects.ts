/**
 * 项目页数据源（纯内容）。
 * 页面展示与筛选规则由 src/config/projectsConfig.ts 控制。
 */
import type { ProjectItem } from "@/types/projectsConfig";

export const projectsData: ProjectItem[] = [
	{
		key: "miancoach",
		title: "MianCoach · AI 面试陪练",
		summary: "基于 RAG 的技术面试陪练应用，整合知识库问答、模拟面试与复盘。使用 Spring Boot 3 + pgvector + Vue 3 构建。",
		category: "web",
		phase: "shipped",
		technologies: ["Java", "Spring Boot", "PostgreSQL", "pgvector", "Vue 3", "RAG"],
		icon: "material-symbols:psychology-outline",
		cover: "/posts/miancoach/screenshot.png",
		coverAlt: "MianCoach 知识库问答界面",
		featured: true,
		website: "https://prep.eriiagi.com",
		repository: "https://github.com/elaina-agi/miancoach",
		year: "2026",
	},
	{
		key: "ocr-translate",
		title: "OCR Translate",
		summary: "轻量级 Windows 截图翻译工具。框选屏幕，OCR 识别原文，悬浮窗显示译文。使用 Rust + egui 构建。",
		category: "cli",
		phase: "shipped",
		technologies: ["Rust", "egui", "Windows OCR"],
		icon: "material-symbols:translate",
		cover: "/posts/ocr-translate/screenshot.png",
		coverAlt: "OCR Translate 翻译界面",
		featured: true,
		repository: "https://github.com/elaina-agi/ocr-translate",
		year: "2026",
	},
];

/** 获取所有项目数据列表 */
export function getProjectsList(): ProjectItem[] {
	return projectsData;
}
