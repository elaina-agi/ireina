---
title: OCR Translate - 轻量级截图翻译工具
published: 2026-11-14
description: 用 Rust + egui 开发的 Windows 截图翻译工具，支持快速 OCR 识别和多翻译服务。框选屏幕，识别原文，悬浮窗显示译文，轻量快速。
image: /posts/ocr-translate/screenshot.png
tags: [Rust, OCR, 翻译, egui, Windows, 开源]
category: 项目
draft: false
lang: ''
---

## 项目简介

[OCR Translate](https://github.com/elaina-agi/ocr-translate) 是一个轻量级的 Windows 截图翻译工具，使用 Rust 和 egui 开发。按 `Ctrl+Shift+T` 框选屏幕，识别原文后在悬浮窗口中查看译文；也可以在主窗口翻译图片或直接输入的文字。

**主要特性：**
- 📸 **框选截图翻译**：快捷键 `Ctrl+Shift+T`，OCR 识别后尽早显示结果
- 🚀 **轻量快速**：Rust 编写，启动快、占用低
- 🪟 **多悬浮窗口**：固定的结果窗会保留，新结果窗会避开已有窗口
- 🔄 **最新截图优先**：翻译过程中可再次框选，新截图会取代旧任务
- 🌐 **多翻译服务**：支持 DeepL、百度、火山引擎、OpenAI Vision 等
- 🎙️ **语音朗读**（可选）：Azure 语音合成，支持多种语言

[📥 下载 Windows 版本](https://github.com/elaina-agi/ocr-translate/releases/latest)

## 技术栈

- **语言**：Rust 1.82+
- **GUI 框架**：egui + eframe（即时模式 GUI）
- **OCR 引擎**：Windows OCR（系统自带，无需联网）
- **截图**：`screenshots` crate
- **网络请求**：`reqwest`（异步 HTTP 客户端）
- **平台**：Windows 10/11

## 功能详解

### 1. 屏幕框选翻译

**使用流程：**
1. 按 `Ctrl+Shift+T` 或点击主窗口「框选屏幕」
2. 鼠标拖动框选识别区域
3. 系统 OCR 识别原文，结果窗口尽早显示
4. 翻译服务返回译文，更新到结果窗口

**体验优化：**
- OCR 识别完成后立即显示原文，不等翻译完成
- 翻译过程中可继续框选，新截图成功后会取代旧任务
- 旧任务的迟到结果不会覆盖新结果，避免混乱

### 2. 本地 Windows OCR

使用 Windows 系统自带的 OCR 引擎识别文字：
- **无需联网**：完全离线识别
- **多语言支持**：中文、英文、日文等（取决于系统安装的语言包）
- **轻量快速**：直接调用系统 API，不依赖第三方服务

**添加语言包（如果识别不准）：**
1. 打开「设置」→「时间和语言」→「语言和区域」
2. 点击「添加语言」，搜索你需要的语言（如日语）
3. 安装后，OCR Translate 会自动检测并使用

### 3. 多翻译服务支持

**内置翻译服务：**
- **DeepL API**：翻译质量高，支持免费层和 Pro
- **百度翻译**：中文支持好，需要百度翻译 API Key
- **火山引擎**：字节跳动的翻译服务
- **OpenAI Vision**：使用视觉模型直接识别图片并翻译（可跳过 OCR）

**配置方式：**
- 在主窗口点击「设置」
- 填入对应服务的 API Key
- 密钥使用 Windows DPAPI 加密存储，只能由同一台电脑的同一用户解密

### 4. 悬浮结果窗口

**窗口特性：**
- 可拖动、可缩放
- 可复制译文到剪贴板
- 固定后会在后续截图中保留
- 新窗口会自动避开已有窗口，不重叠
- 点击「打开主窗口」可回到设置界面

### 5. 语音朗读（可选）

集成 Azure 语音合成服务：
- 支持中文、英文、日文等多种语言
- 支持调整语速、音调
- 需要 Azure 语音服务的订阅密钥

## 技术亮点

### 1. Rust + egui 的即时模式 GUI

**为什么选择 egui？**
- **即时模式**：不需要维护复杂的状态树，代码更简洁
- **跨平台**：理论上可以移植到 macOS、Linux（但 Windows OCR API 不跨平台）
- **性能好**：Rust 原生性能，启动快、占用低
- **内置布局**：flexbox 风格的布局系统，易用

**示例代码：**
```rust
// egui 的即时模式写法
egui::Window::new("结果")
    .resizable(true)
    .show(ctx, |ui| {
        ui.label(&self.original_text);
        ui.separator();
        ui.label(&self.translated_text);
        if ui.button("复制译文").clicked() {
            self.copy_to_clipboard();
        }
    });
```

### 2. 异步任务处理

使用 `tokio` 异步运行时处理 OCR 和翻译：
- OCR 和翻译在后台线程执行，不阻塞 GUI
- 使用 `mpsc` 通道在线程间传递结果
- 超时控制：网络请求 20 秒超时，避免卡死

### 3. 截图取消机制

**问题：**
- 用户快速连续截图时，旧的翻译任务可能还在进行
- 如果不处理，旧结果会覆盖新结果

**解决方案：**
- 每次新截图时，生成一个唯一的任务 ID
- 翻译完成时，检查任务 ID 是否匹配
- 不匹配则丢弃结果，不更新窗口

### 4. 配置加密存储

**安全措施：**
- API Key 使用 Windows DPAPI 加密后存储在 `%APPDATA%\ocr-translate\config.json`
- 只能由同一台电脑的同一 Windows 用户解密
- 临时截图保存在系统临时目录，程序退出时自动清理

## 开发动机

### 为什么要做这个工具？

在学习日语、查看外文文档时，经常需要翻译屏幕上的文字。市面上的翻译工具要么太重（带广告、后台常驻）、要么要收费、要么隐私不安全。我想要一个：
- **轻量级**：启动快，占用少，用完就关
- **离线 OCR**：不把截图传到云端，隐私安全
- **开源免费**：代码透明，可审计

### 为什么用 Rust？

1. **性能好**：Rust 编译出的可执行文件小、启动快
2. **学习曲线**：正好在学 Rust，拿来练手
3. **生态成熟**：`egui`、`reqwest`、`tokio` 等库都很好用

## 部署运行

### 下载使用

直接下载编译好的可执行文件：
- [下载最新版本](https://github.com/elaina-agi/ocr-translate/releases/latest)
- 解压后运行 `ocr-translate.exe`
- 首次运行会要求设置翻译服务（可选 DeepL、百度等）

### 从源码构建

需要 Rust 1.82+ 和 Visual Studio C++ Build Tools：

```powershell
# 克隆仓库
git clone https://github.com/elaina-agi/ocr-translate.git
cd ocr-translate

# 开发运行
cargo run

# 测试
cargo test --locked

# 发布构建
cargo build --release --locked
```

构建产物位于 `target/release/ocr-translate.exe`。

## 开发心得

### 1. egui 的即时模式很爽

和传统的保留模式 GUI（如 Qt、GTK）不同，egui 的即时模式不需要维护复杂的状态树。每一帧都重新绘制整个界面，代码逻辑更清晰。

**优点：**
- 不需要手动同步状态和 UI
- 调试方便，状态变化立即体现

**缺点：**
- 复杂动画不如保留模式流畅
- 需要注意避免每帧都做重复计算

### 2. Windows API 的坑

Windows OCR API 是 WinRT 接口，Rust 调用需要通过 `windows` crate：
- 异步 API 要转成 Rust 的 `async/await`
- 语言包检测依赖系统设置，需要给用户明确提示

### 3. 多线程的挑战

截图、OCR、翻译都是耗时操作，不能阻塞 GUI 主线程。用 `tokio` 异步处理后，还要注意：
- GUI 更新必须在主线程
- 使用 `mpsc` 通道传递结果
- 任务取消要及时响应

### 4. 用户体验细节

- **快捷键全局生效**：不需要窗口在前台
- **结果窗避开已有窗口**：减少重叠，一次截图能看到多个结果
- **OCR 先显示，翻译后更新**：即使翻译慢，也能先看到原文

## 未来规划

- [ ] 支持 macOS 和 Linux（需要替换 Windows OCR）
- [ ] 增加 OCR 结果编辑（识别错误时手动修正）
- [ ] 支持更多翻译服务（Google Translate、彩云小译等）
- [ ] 历史记录功能（保存最近的翻译结果）
- [ ] 划词翻译（监听剪贴板）

## 项目地址

- 🔗 GitHub: [elaina-agi/ocr-translate](https://github.com/elaina-agi/ocr-translate)
- 📥 下载: [Releases](https://github.com/elaina-agi/ocr-translate/releases)

欢迎 Star ⭐、提 Issue 和 PR！

---

:::tip[给 Rust 初学者]
这个项目很适合 Rust 入门者练手：代码量适中（约 2000 行），涉及 GUI、异步、网络请求等常见场景。egui 的即时模式比传统 GUI 框架好上手。
:::

:::note[隐私说明]
- OCR 使用 Windows 系统本地引擎，截图不上传
- 翻译需要调用在线 API，但只传送文本，不传送图片
- API Key 加密存储在本地，不上传到任何服务器
:::
