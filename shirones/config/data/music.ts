import type { TrackDescriptor } from "@/types/musicConfig";

/**
 * 侧栏音乐本地曲目数据源。
 * 遵循「零额外负担」原则：配置与数据解耦，此处专用于管理本地曲目列表。
 *
 * 添加曲目：在 musicTracks 中追加一项即可：
 * - id: 唯一标识
 * - title: 曲目标题
 * - artist: 艺术家（可选）
 * - cover: 封面图地址（可选；推荐相对 /src，亦支持 /public 或绝对 URL）
 * - source: 音频文件地址（相对 /public 或绝对 URL）
 * - duration: 曲目时长（秒，可选）
 */
export const musicTracks: readonly TrackDescriptor[] = [
	{
		id: "track-1",
		title: "所念皆星河",
		artist: "CMJ",
		cover: "/assets/music/cover/所念皆星河.jpg",  // 没有封面就删掉这行
		source: "/assets/music/url/所念皆星河.mp3",
		duration: 180,  // 歌曲时长（秒），可选，不填播放器会自动检测
	},
	{
		id: "track-2",
		title: "Call of Silence",
		artist: "或许再也不见",
		cover: "/assets/music/cover/Call-of-Silence.jpg",
		source: "/assets/music/url/Call of Silence（最自由的版本） - 或许再也不见.mp3",
		duration: 240,
	},
];
