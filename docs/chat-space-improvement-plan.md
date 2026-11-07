# 对话空间插件体验改进方案

> 基于 Claude 产品哲学与 open-claude-ui 设计系统的深度研究
> 日期：2026-11-06
> 参考文档：
> - [Claude 聊天窗口的 7 大交互设计亮点](https://www.uisdc.com/claude-3)
> - [open-claude-ui 设计系统文档](https://github.com/Caho1/open-claude-ui)
> - Claude Design System (CDS) 完整规范

---

## 一、核心问题诊断

### 1.1 当前问题清单

| 问题 | 严重等级 | 根因分析 |
|---|---|---|
| 右侧画板多次绘画重叠 | 高 | 白板状态管理缺陷，未正确处理多次绘图的叠加逻辑 |
| 画板功能单一（仅思维导图） | 中 | Drawnix 功能未完全释放，缺少更多图形类型支持 |
| 全屏后切换按钮消失 | 高 | 切换器定位逻辑未适配全屏状态 |
| 不能修改上一条 prompt | 高 | 缺失基础对话编辑能力，违背 AI 对话产品基本交互预期 |
| cowork 和 chat 区分不明确 | 中 | 模式定位模糊，UI 切换生硬，用户心智模型不清晰 |
| 整体体验不够流畅 | 中 | 缺少 Claude 级别的交互细节打磨和微动效 |

---

## 二、Claude 产品哲学核心洞察

### 2.1 设计哲学三原则

根据对 Claude 的深度研究，其设计哲学可总结为：

#### 1. **温润的人文质感 (Editorial Warmth)**
- 陶土橙 `#d97757` 作为主品牌色，传递温暖而非冰冷科技感
- 米白底色 `#fcfcfb`，营造纸质阅读体验
- 衬线字体系统，强化创作与沉浸感

#### 2. **低对比多层表面 (Low-contrast Surface Layering)**
- Surface 0-3 四层微明度差（不用生硬 1px 黑边框）
- 0.5px 发丝细边（Hairline）+ `box-shadow` 实现边框（避免盒模型抖动）
- 双环投影架构：外环边框 + 内环微光

#### 3. **有机轻量动效 (Lightweight Organic Motion)**
- 生产级物理弹簧参数（4 套阻尼常数）
- CSS Grid `0fr → 1fr` 解决高度抖动
- GPU 硬件加速 + 模糊消解

### 2.2 七大交互设计亮点

#### 1. **网页化信息排版**
- 不是聊天容器，而是信息阅读界面
- 标题、正文、表格、文件卡片清晰分层
- 模块化内容承载（Skill、Figma、PPT 预览）

#### 2. **可视化输出：让用户看见 AI 的工作链路**
- 展示 `Viewed files` / `Ran commands` / `Created file`
- 过程可视化，建立信任
- 细节可展开，兼顾不同人群

#### 3. **随时调整，让 AI 输出更准确**
- **随时中断**：停止按钮始终可用
- **实时修正**：中断后立即追加指令
- **协作感**：用户是监督者，AI 是执行者

#### 4. **选中文本后可基于局部内容继续追问**
- Reply 按钮浮现在选中文本旁
- "所见即所问"，无需复制粘贴
- 思考过程不被打断

#### 5. **渐进式输入，为用户提供合理的结果**
- 识别模糊意图，主动澄清
- Q&A 卡片式信息收集
- 信息齐了才开始做

#### 6. **对话窗口即画布**
- PPT/HTML/SVG 直接预览
- 可交互、可操作
- 一键外部应用打开

#### 7. **Artifacts 可直接发布**
- 生成内容可一键生成公开链接
- 创作与分享整合进同一流程

---

## 三、改进方案（按优先级排序）

### P0：核心功能修复（必须立即解决）

#### 3.1 修复全屏后切换按钮消失

**问题根因**：切换器定位逻辑只考虑了品牌行的常规位置，未适配全屏状态。

**解决方案**：
```javascript
// 在 client.js 中增强切换器定位逻辑
const positionSwitcher = () => {
  const brandRow = document.querySelector(PART('logo-row'));
  if (!brandRow) return;
  
  // 检测全屏状态
  const isFullscreen = document.fullscreenElement !== null;
  
  if (isFullscreen) {
    // 全屏时固定到左上角
    switcher.style.position = 'fixed';
    switcher.style.top = '16px';
    switcher.style.left = '16px';
    switcher.style.zIndex = '10000';
  } else {
    // 常规模式按品牌行定位
    const rect = brandRow.getBoundingClientRect();
    switcher.style.position = 'fixed';
    switcher.style.top = `${rect.top}px`;
    switcher.style.left = `${rect.left}px`;
  }
};

// 监听全屏变化
document.addEventListener('fullscreenchange', positionSwitcher);
```

**验收标准**：全屏状态下切换器仍然可见且可点击。

---

#### 3.2 修复白板多次绘画重叠问题

**问题根因**：
1. 绘图去重逻辑 `会话:seq:序号` 可能失效
2. 白板未正确清理前一次绘图状态
3. 扫描逻辑可能重复插入相同图形

**解决方案**：
```javascript
// 在 client.js 白板扫描逻辑中增强去重
const drawnDiagrams = new Map(); // 改用 Map 存储，key 为唯一标识

const scanAndDrawDiagrams = () => {
  const chatSession = openSessionId();
  if (!chatSession || state.surface !== 'chat') return;
  
  const messages = getSessionMessages(chatSession);
  
  messages.forEach((msg, index) => {
    if (msg.role !== 'assistant') return;
    
    const blocks = extractDrawnixBlocks(msg.content);
    blocks.forEach((block, blockIndex) => {
      // 生成唯一 key
      const uniqueKey = `${chatSession}:${msg.seq}:${blockIndex}:${hashContent(block.content)}`;
      
      // 检查是否已绘制
      if (drawnDiagrams.has(uniqueKey)) {
        console.log('[Drawnix] 跳过已绘制的图形:', uniqueKey);
        return;
      }
      
      // 标记为已绘制
      drawnDiagrams.set(uniqueKey, true);
      
      // 绘制到白板
      drawToBoard(block);
    });
  });
};

// 增加内容哈希函数，防止相同内容重复绘制
const hashContent = (content) => {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
};
```

**验收标准**：
- 同一张图只绘制一次
- 切换会话后白板自动切换到对应会话的画布
- 新建会话时白板为空白

---

#### 3.3 实现消息编辑功能

**问题根因**：插件未接入宿主的消息编辑能力，这是 AI 对话产品的基础交互。

**解决方案**：

借鉴 Claude 的"选中文本追问"设计，实现两层编辑能力：

**层级 1：消息气泡悬停操作栏**
```javascript
// 为每条消息添加操作栏
const enhanceMessageBubbles = () => {
  const userMessages = document.querySelectorAll('[data-message-role="user"]');
  
  userMessages.forEach(msg => {
    if (msg.dataset.csEnhanced) return;
    msg.dataset.csEnhanced = 'true';
    
    // 创建操作栏
    const toolbar = document.createElement('div');
    toolbar.className = 'dsh-cs-msg-toolbar';
    toolbar.innerHTML = `
      <button class="dsh-cs-msg-btn" data-action="edit" title="编辑消息">
        <svg><!-- 编辑图标 --></svg>
      </button>
      <button class="dsh-cs-msg-btn" data-action="copy" title="复制">
        <svg><!-- 复制图标 --></svg>
      </button>
    `;
    
    msg.style.position = 'relative';
    msg.appendChild(toolbar);
    
    // 绑定编辑事件
    toolbar.querySelector('[data-action="edit"]').addEventListener('click', () => {
      enterEditMode(msg);
    });
  });
};

const enterEditMode = (msgElement) => {
  const originalText = msgElement.textContent;
  
  // 替换为可编辑状态
  msgElement.contentEditable = 'true';
  msgElement.classList.add('dsh-cs-editing');
  msgElement.focus();
  
  // 选中全部文本
  const range = document.createRange();
  range.selectNodeContents(msgElement);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  
  // 监听确认/取消
  const confirmEdit = () => {
    const newText = msgElement.textContent;
    if (newText !== originalText && newText.trim()) {
      // 调用宿主 API 重新发送
      resendMessage(newText);
    }
    exitEditMode(msgElement);
  };
  
  msgElement.addEventListener('blur', confirmEdit, { once: true });
  msgElement.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      confirmEdit();
    } else if (e.key === 'Escape') {
      msgElement.textContent = originalText;
      exitEditMode(msgElement);
    }
  });
};
```

**层级 2：选中文本快速追问（仿 Claude）**
```javascript
// 监听文本选中事件
document.addEventListener('mouseup', (e) => {
  if (state.surface !== 'chat') return;
  
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();
  
  if (selectedText.length > 0) {
    showReplyButton(selection, selectedText);
  } else {
    hideReplyButton();
  }
});

const showReplyButton = (selection, text) => {
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  
  let replyBtn = document.querySelector('.dsh-cs-reply-btn');
  if (!replyBtn) {
    replyBtn = document.createElement('button');
    replyBtn.className = 'dsh-cs-reply-btn';
    replyBtn.textContent = 'Reply';
    document.body.appendChild(replyBtn);
  }
  
  // 定位到选中文本旁边
  replyBtn.style.position = 'fixed';
  replyBtn.style.top = `${rect.bottom + 8}px`;
  replyBtn.style.left = `${rect.left}px`;
  replyBtn.style.display = 'block';
  
  // 点击后填入输入框
  replyBtn.onclick = () => {
    fillComposer(`针对「${text}」继续讨论：`);
    hideReplyButton();
  };
};
```

**验收标准**：
- 用户消息悬停显示"编辑"按钮
- 点击编辑可修改消息并重新发送
- 选中任意文本后显示 Reply 按钮
- 点击 Reply 自动填充上下文到输入框

---

### P1：交互体验提升（重要但不紧急）

#### 3.4 重新定义 Chat 与 Cowork 的区分

**根本问题**：当前两个模式在 UI 和交互上几乎没有区别，用户不知道何时该用哪个。

**Claude 的启示**：
- Claude 本身没有"模式切换"，而是通过 **Projects（项目）** 来组织不同的工作上下文
- 每个 Project 有独立的知识库、文件和对话历史
- 界面始终一致，但上下文自动切换

**改进方向 A：取消模式切换，改为场景化入口**

参考 Claude 的做法，不再有 Chat/Cowork 的显式切换，而是：

```
侧栏结构：
├─ 💬 快速对话（临时会话，不保存上下文）
├─ 📚 我的项目
│   ├─ 项目 A（自动包含文件、知识库）
│   ├─ 项目 B
│   └─ ...
├─ 📝 文档创作（对应现在的 Cowork，但名字更明确）
└─ ⚙️ 设置
```

**改进方向 B：保留模式，但强化视觉区分**

如果必须保留 Chat/Cowork：

| 维度 | Chat（对话） | Cowork（协作） |
|---|---|---|
| **主色调** | 保持 DeepSeek 蓝 | 改为陶土橙系 |
| **输入框占位符** | "今天我能为您做些什么？" | "让我们一起创作点什么..." |
| **右侧面板** | Artifacts（只读预览） | 文件树 + 实时编辑器 |
| **工具栏** | 隐藏文件操作 | 显示保存/导出/分享 |
| **顶部提示** | 显示"纯对话模式，不会保存文件" | 显示"协作模式，内容保存在 ~/.dsh/chat-space" |

```css
/* Chat 模式 */
body[data-dsh-chat-space="chat"][data-cs-mode="chat"] {
  --mode-accent: var(--dsw-alias-brand-primary);
  --mode-surface: var(--cds-surface-1);
}

/* Cowork 模式 */
body[data-dsh-chat-space="chat"][data-cs-mode="cowork"] {
  --mode-accent: #d97757; /* 陶土橙 */
  --mode-surface: #fcfcfb; /* 米白色 */
}

[data-slot="conversation.composer.bar"] {
  background: var(--mode-surface);
  border-color: var(--mode-accent);
}
```

**推荐方案**：方向 A（取消模式切换），更符合 Claude 的产品哲学。

---

#### 3.5 丰富白板功能

**当前限制**：只支持 mermaid 流程图和 markdown 思维导图。

**改进方案**：

1. **新增图形类型支持**：
   - 手绘风格图形（Excalidraw 风格）
   - UML 类图 / 时序图
   - 甘特图 / 时间线
   - 自由画板（支持手写/标注）

2. **多画布管理**：
```javascript
// 为每个会话支持多个画布
const boardManager = {
  boards: new Map(), // sessionId -> [board1, board2, ...]
  
  createBoard(sessionId, name = '画布 1') {
    const boards = this.boards.get(sessionId) || [];
    const newBoard = {
      id: generateId(),
      name,
      content: [],
      createdAt: Date.now()
    };
    boards.push(newBoard);
    this.boards.set(sessionId, boards);
    return newBoard;
  },
  
  switchBoard(sessionId, boardId) {
    // 切换到指定画布
  }
};
```

3. **画布操作栏**：
```html
<div class="dsh-cs-board-toolbar">
  <button data-action="new">新建画布</button>
  <select data-action="switch">
    <option>画布 1</option>
    <option>画布 2</option>
  </select>
  <button data-action="clear">清空</button>
  <button data-action="export">导出 PNG</button>
  <button data-action="save">保存为 .drawnix</button>
</div>
```

**验收标准**：
- 每个会话可创建多个画布
- 画布之间可快速切换
- 支持导出为图片/文件

---

#### 3.6 实现 Claude 级别的动效打磨

**借鉴 open-claude-ui 的物理参数**：

```css
/* 引入 Claude 的弹簧物理常数 */
:root {
  /* 触觉微震（按钮点击） */
  --spring-tactile: cubic-bezier(0.34, 1.56, 0.64, 1);
  --duration-tactile: 70ms;
  
  /* 几何咬合（Tab 切换） */
  --spring-snap: cubic-bezier(0.22, 1, 0.36, 1);
  --duration-snap: 120ms;
  
  /* 面板滑入 */
  --spring-panel: cubic-bezier(0.16, 1, 0.3, 1);
  --duration-panel: 300ms;
  
  /* 大型模态 */
  --spring-modal: cubic-bezier(0.32, 0, 0.67, 0);
  --duration-modal: 400ms;
}

/* 按钮点击触感 */
.dsh-cs-mode-option:active {
  transform: scale(0.98);
  transition: transform var(--duration-tactile) var(--spring-tactile);
}

/* 白板滑入动画 */
.dsh-cs-drawer[data-state="opening"] {
  animation: slideIn var(--duration-panel) var(--spring-panel);
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* 输入框聚焦微光 */
[data-slot="conversation.composer.bar"]:focus-within {
  box-shadow: 
    0 4px 24px rgba(0, 0, 0, 0.08),
    inset 0 0 0 1px var(--cds-border-strong),
    0 0 0 1px var(--cds-border-strong);
  transition: box-shadow 120ms cubic-bezier(0.22, 1, 0.36, 1);
}
```

**关键改进点**：
1. 所有按钮增加 `scale(0.98)` 触觉反馈
2. 面板展开使用真实物理弹簧曲线
3. 输入框聚焦使用双环投影动画
4. 消息气泡入场使用淡入 + 上移动画

---

### P2：进阶功能（可选，提升竞争力）

#### 3.7 实现"随时中断"能力

**Claude 的核心交互**：生成过程中始终可以停止并追加指令。

```javascript
// 监听生成状态
const watchGenerationState = () => {
  const stopBtn = document.querySelector('[data-control="stop"]');
  if (!stopBtn) return;
  
  // 生成中时显示"停止"按钮
  stopBtn.addEventListener('click', () => {
    // 调用宿主 API 停止生成
    stopGeneration();
    
    // 立即聚焦输入框，允许追加指令
    focusComposer();
    
    // 显示提示
    showToast('已停止生成，您可以追加新的指令');
  });
};
```

---

#### 3.8 渐进式输入引导

**Claude 的做法**：遇到模糊需求时，主动用卡片式 Q&A 收集信息。

```javascript
// 检测模糊意图
const detectAmbiguousIntent = (userInput) => {
  const triggers = [
    { pattern: /写.*报告|做.*分析/, questions: ['报告给谁看？', '希望涵盖哪些内容？', '字数要求？'] },
    { pattern: /画.*图|生成.*图/, questions: ['什么类型的图？', '数据来源是？', '风格偏好？'] }
  ];
  
  for (const trigger of triggers) {
    if (trigger.pattern.test(userInput)) {
      return trigger.questions;
    }
  }
  return null;
};

// 渲染引导卡片
const renderGuidanceCard = (questions) => {
  const card = document.createElement('div');
  card.className = 'dsh-cs-guidance-card';
  card.innerHTML = `
    <div class="dsh-cs-guidance-header">
      <span>💡</span>
      <span>让我确认几个细节，以便为您提供更精准的结果</span>
    </div>
    <div class="dsh-cs-guidance-questions">
      ${questions.map((q, i) => `
        <div class="dsh-cs-guidance-q">
          <label>${i + 1}. ${q}</label>
          <input type="text" data-q="${i}" />
        </div>
      `).join('')}
    </div>
    <button class="dsh-cs-guidance-submit">确认并继续</button>
  `;
  return card;
};
```

---

## 四、样式系统全面升级

### 4.1 引入 Claude Design System (CDS) 令牌

```css
/* 在 client.js 的 <style> 中引入 CDS 令牌 */
:root {
  /* Surface 阶梯 */
  --cds-surface-0: #f9f9f7;
  --cds-surface-1: #fcfcfb;
  --cds-surface-2: #ffffff;
  --cds-surface-3: #ffffff;
  
  /* 深色模式 */
  --cds-surface-0-dark: #0b0b0b;
  --cds-surface-1-dark: #151515;
  --cds-surface-2-dark: #1a1a19;
  --cds-surface-3-dark: #20201f;
  
  /* 品牌色 */
  --cds-clay: #d97757;
  --cds-clay-emphasized: #cc5a36;
  
  /* 边框 */
  --cds-border: hsla(0, 0%, 8%, 0.10);
  --cds-border-strong: hsla(0, 0%, 8%, 0.20);
  --cds-ring-hairline: 1px;
  
  /* 圆角 */
  --radius-xs: 2px;
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  --radius-2xl: 16px;
  --radius-bubble: 18px;
  --radius-composer: 20px;
  
  /* 阴影 */
  --shadow-sm: 0 1px 2px 0 rgba(0,0,0,0.05), 0 2px 8px 0 rgba(0,0,0,0.08);
  --shadow-md: 0 2px 4px 0 rgba(0,0,0,0.05), 0 6px 16px 0 rgba(0,0,0,0.08);
  --shadow-popover: inset 0 0 0 0px transparent, 0 0 0 1px var(--cds-border), 
                    0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.08);
}

/* 高分屏发丝细边 */
@media (min-resolution: 2dppx) {
  :root { --cds-ring-hairline: 0.5px; }
}
```

### 4.2 用 box-shadow 替代 border

```css
/* 避免盒模型抖动 */
.dsh-cs-mode-option {
  box-shadow: inset 0 0 0 1.5px transparent;
  transition: box-shadow 120ms cubic-bezier(0.22, 1, 0.36, 1);
}

.dsh-cs-mode-option[aria-checked="true"] {
  box-shadow: inset 0 0 0 1.5px var(--cds-clay);
}
```

---

## 五、实施路线图

### 第一阶段（P0，1-2 天）
- [ ] 修复全屏切换器消失
- [ ] 修复白板重叠问题
- [ ] 实现消息编辑基础功能

### 第二阶段（P1，3-5 天）
- [ ] 重新设计 Chat/Cowork 区分
- [ ] 引入 CDS 令牌系统
- [ ] 实现 Claude 级别动效

### 第三阶段（P1，3-5 天）
- [ ] 丰富白板功能
- [ ] 实现选中文本追问
- [ ] 全面样式升级

### 第四阶段（P2，可选）
- [ ] 实现随时中断能力
- [ ] 渐进式输入引导
- [ ] Artifacts 发布功能

---

## 六、验证标准

### 功能完整性
- [ ] 全屏状态下所有功能正常
- [ ] 白板可正确处理多次绘图
- [ ] 消息可编辑和重新发送
- [ ] Chat/Cowork 区分清晰

### 交互流畅度
- [ ] 所有动画使用物理弹簧曲线
- [ ] 按钮有明确的触觉反馈
- [ ] 面板展开/收起流畅自然
- [ ] 无卡顿、抖动、闪烁

### 视觉一致性
- [ ] 遵循 CDS 令牌系统
- [ ] 圆角/阴影/边框统一
- [ ] 深浅色模式完整支持
- [ ] 所有字体/尺寸符合规范

---

## 七、参考资源

1. **Claude 产品研究**
   - [Claude 7 大交互亮点深度拆解](https://www.uisdc.com/claude-3)
   - [Claude Projects 官方文档](https://code.claude.com/docs/zh-CN/claude-projects)

2. **open-claude-ui 设计系统**
   - [完整技术手册](https://github.com/Caho1/open-claude-ui/tree/main/docs/v1)
   - [设计哲学与令牌体系](https://github.com/Caho1/open-claude-ui/blob/main/docs/v1/01-设计哲学与设计令牌体系.md)

3. **动效物理学**
   - [4 套生产级弹簧参数](https://github.com/Caho1/open-claude-ui/blob/main/docs/v1/04-动效物理学、着色器与环境光影.md)

---

## 八、后续迭代方向

1. **智能化场景识别**
   - 根据用户输入自动推荐合适的模式
   - 例如："写一篇文章" → 自动建议进入 Cowork

2. **多模态输入增强**
   - 语音输入支持
   - 图片拖拽直接理解
   - 屏幕截图标注

3. **协作功能**
   - 会话分享（生成公开链接）
   - 多人实时协作白板
   - 评论与批注系统

4. **知识库集成**
   - 类似 Claude Projects 的文件上传
   - 自动建立会话知识库
   - 跨会话知识共享

---

**最终目标**：让对话空间成为真正意义上的"第二大脑"，而不仅仅是一个聊天工具。
