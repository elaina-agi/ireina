/**
 * 看板娘配置:台词、点击区域、悬停提示都在这里改
 * 完整选项见 kanban-widget 项目的 README / src/types.ts
 */
export const kanbanConfig = {
  models: [
    {
      name: "诺瓦",
      // 相对站点根目录,启动脚本会自动加上 base 前缀
      path: "live2d/noir/noir.model3.json",
      // 模型自己没带点击区域,手动划:[x, y, 宽, 高],相对看板娘区域的比例
      hitAreas: { Head: [0.15, 0.3, 0.5, 0.38], Body: [0.08, 0.68, 0.65, 0.32] },
      // 脸附近灵敏、远处限幅;眼睛比头部先看过去,以后微调只改这里
      look: {
        anchor: [0.4, 0.49],
        sensitivity: 1.3,
        headMax: 0.75,
        eyeMax: 0.95,
        headResponse: 120,
        eyeResponse: 55,
        // 保留模型跟随参数；博客减少动效时渲染暂停，恢复后继续按此灵敏度跟随
        reducedHeadScale: 0.9,
        idleDelay: 0, // 鼠标停留时保持指向,不再五秒后自动回正
        leaveDelay: 180, // 短暂碰到窗口边缘时不立即回正
        returnResponse: 160, // 真正离开后平滑回正;减少动效下自动缩短
        reentryDuration: 180, // 从任务栏等页面外重入时短暂衔接,不降低页面内灵敏度
      },
      messages: {
        welcome: ["那、那个……欢迎来玩。", "唔……你来啦。"],
        idle: [
          "车窗外的星星……好漂亮。",
          "有、有点想喝热可可……",
          "唔……在发呆？我也在。",
          "喵……不、不是在说你。",
          "要一起看会儿风景吗……",
        ],
        tap: {
          Head: ["呜喵！要、要提前说一声……", "……摸头的话，一下下就好。", "哈唔……别、别突然这样。"],
          Body: ["唔？怎、怎么了……", "不、不要戳啦……", "那个……有什么事吗？"],
          default: ["唔？", "……在叫我吗？"],
        },
      },
    },
  ],
  position: "left",
  // 比主题的悬浮按钮(45)、导航栏(50)、侧边抽屉(60)都低,不会挡住它们
  zIndex: 40,
  // 固定位置，不允许拖动（避免拖到下半身露出来不好看）
  draggable: false,
  // 一言的句子不像她会说的话,关掉
  hitokoto: false,
  // 下面几项照着 Mizuki 自带的看板娘(l2d-widget)调的:
  bubble: "solid", // 主题色实心气泡;"glass" = 毛玻璃白卡片
  bubbleFloat: true, // 气泡轻轻上下浮动
  status: "tab", // 休息 / 加载时贴屏幕左边的竖向小标签;"pill" = 左下角横条
  // 正常动效保留角色滑入/滑出；博客减少动效统一立即切换（博客开关在访客未选择时跟随系统设置）
  entranceMotion: "auto", // 不再强制绕过博客减少动效
  exitMotion: "auto", // 手动休眠仍释放模型，动效开关不会将其唤醒
  transition: 1500, // 出场和退场的滑动时长
  idleInterval: 10000, // 闲聊间隔 ms(Mizuki 大约 8 秒一句,嫌吵就调大)
  messages: {
    // 用 id / class 选元素:主题切换语言后 aria-label 会变,不能拿来选
    hover: [
      { selector: ".top-app-bar__nav-link", text: ["要去「{text}」看看吗……", "「{text}」……我、我也想去。"] },
      { selector: ".m3-blog-postcard__title", text: ["「{text}」……这篇看起来很有意思。", "要、要读这篇吗？"] },
      { selector: "#search-switch", text: "在找什么吗……我、我也帮你找。" },
      { selector: "#scheme-switch", text: "晚、晚上的话……深色比较不刺眼。" },
      { selector: "#display-settings-switch", text: "那里……可以换主题颜色哦。" },
    ],
  },
};
