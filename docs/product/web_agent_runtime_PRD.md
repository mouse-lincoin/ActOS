# 产品 PRD：ActOS Web Agent Runtime

> Working codename: **ActOS**  
> 定位：把自然语言意图安全地转化为网页软件中的可执行工作。  
> 核心命题：Web Agent 的终局不是“会点网页”，而是成为 **数字世界的执行层**。

---

## 1. 背景判断

今天的大多数 AI Web 能力仍然停留在信息层：搜索、阅读、总结、研究。它们解决的是“我想知道什么”。但真实数字劳动大量发生在网页 UI 中：登录、筛选、填写、上传、下载、审批、修改配置、提交工单、处理订单、同步数据。

ActOS 要解决的问题不是“让 Agent 看网页”，而是：

> 当用户表达一个目标时，系统能够选择浏览器、API、脚本、文件、人工确认等执行手段，稳定、安全、可审计地把目标推进到完成状态。

浏览器只是 actuator，不是产品本体。产品本体是一个面向 Agent 的运行时：会话、状态、权限、动作、恢复、审计和人类接管。

---

## 2. 最大终局形态

### 2.1 一句话愿景

**Natural Language Intent → Digital Work Done.**

用户不再亲自进入每个 SaaS、后台、门户、控制台完成机械操作，而是把目标交给 Agent；Agent 使用浏览器、API、终端、文件和消息系统完成任务；用户只在敏感节点确认。

### 2.2 终局产品形态

ActOS 最终是：

- **Browser Runtime**：让 Agent 以隔离、可恢复、可审计的方式使用网页。
- **Action Runtime**：把“点击查询”“导出报表”“填写申请”这类意图 grounding 到真实动作。
- **Trust Runtime**：管理风险、权限、密钥、人类确认和审计。
- **Workflow Runtime**：把一次性网页操作沉淀为可复用的任务流程。
- **Digital Worker Runtime**：调度多个 Agent 在多个软件系统中协作执行任务。

### 2.3 最大边界

如果做到极致，ActOS 会成为：

> 连接自然语言和所有网页软件操作的通用执行层。

它不是搜索引擎，不是单点 RPA，不是浏览器插件，而是 **Agent OS for digital work**。

---

## 3. 产品原则

1. **Intent first, browser second**  
   用户提交的是目标，不是点击指令。Runtime 决定使用浏览器、API、脚本还是人工接管。

2. **Structured first, vision fallback**  
   优先使用 DOM、accessibility tree、network、API、selectors 等结构化信号；视觉截图用于补盲、验证和复杂 UI。

3. **Supervised autonomy**  
   不是追求完全无人监督，而是让 Agent 做 80%–95% 的繁琐步骤，人类负责身份验证、支付、法律提交、不可逆动作和最终确认。

4. **Every action must be replayable**  
   Agent 的每一步动作、观察、判断、证据、风险等级、用户确认都必须可追溯。

5. **No action without policy**  
   每一个动作都通过权限和风险策略。默认最小权限，危险动作显式确认。

6. **Recoverability over perfection**  
   Web 是混乱环境。系统不需要每次都不犯错，但必须能检测失败、回滚、重试、接管和复盘。

---

## 4. 目标用户与场景

### 4.1 目标用户

#### A. AI 应用开发者

他们想给自己的 Agent 增加可靠网页执行能力，但不想自己处理浏览器 session、登录态、截图、重试、权限、trace 和接管。

#### B. 企业运营 / 财务 / 客服 / 供应链团队

他们每天在多个网页登录后台处理重复工作：查订单、下载账单、同步状态、导出报表、核对异常、提交工单。

#### C. SaaS / 内部工具团队

他们想让自己的产品“agent-friendly”，并让 Agent 安全地代表用户完成配置、导入、导出、审批前准备等流程。

#### D. 高级个人用户

他们希望 Agent 帮自己完成复杂个人事务：预约、改签、申请、填表、上传材料、比较登录后价格、停在确认页等待批准。

---

## 5. 核心问题

### 5.1 用户问题

1. 信息型 AI 只能告诉用户怎么做，不能真正进入网页完成操作。
2. 传统 RPA 依赖脚本和坐标，网页变化后极易失效。
3. 通用 Computer Use 能操作屏幕，但缺少会话隔离、长期任务状态、审计、权限和企业级治理。
4. 多网页登录任务涉及 cookie、账号、文件、验证码、支付、审批和敏感数据，必须有安全边界。
5. Agent 失败后很难知道它做了什么、为什么失败、如何恢复。

### 5.2 产品机会

ActOS 把“网页操作”从一次性模型行为，升级成一个可管理的运行时：

- 开发者调用 Runtime，而不是直接控制浏览器。
- 企业配置 policy，而不是完全信任 Agent。
- 用户看到 timeline，而不是黑盒自动化。
- Agent 执行 intent，而不是裸坐标点击。

---

## 6. 核心用户故事

### 6.1 开发者

- 作为开发者，我想创建一个隔离浏览器 session，让 Agent 操作网页但不污染我的真实浏览器。
- 作为开发者，我想调用 `observe()` 获取压缩后的页面语义状态，而不是把整页 snapshot 暴露给模型。
- 作为开发者，我想调用 `act({ intent, target })`，由 Runtime 负责寻找元素、执行、等待稳定和验证结果。
- 作为开发者，我想拿到完整 trace，知道 Agent 每一步看见了什么、做了什么、结果是什么。

### 6.2 企业管理员

- 作为管理员，我想限制 Agent 只能访问指定域名、账号和数据范围。
- 作为管理员，我想定义哪些动作可以自动执行，哪些必须人工审批。
- 作为管理员，我想查看每个 Agent 的操作审计日志和录像回放。
- 作为管理员，我想冻结或撤销某个 Agent 的所有活跃 session。

### 6.3 业务用户

- 作为业务用户，我想让 Agent 登录后台处理重复工作，并在关键节点让我确认。
- 作为业务用户，我想在 Agent 遇到验证码、登录、支付或不确定页面时接管浏览器，然后让 Agent 从当前状态继续。
- 作为业务用户，我想知道 Agent 是否真的完成了任务，而不只是点了几个按钮。

---

## 7. 产品范围

### 7.1 MVP 范围

MVP 不是通用全自动 Web Agent，而是 **可监督、可回放、可恢复的 Web Agent Runtime**。

MVP 包含：

1. Browser Session Manager
2. Observe Layer
3. Action Router
4. State Ledger
5. Checkpoint / Replay
6. Human Handoff
7. Risk Gate
8. Developer SDK
9. Minimal Dashboard

### 7.2 暂不做

MVP 阶段不做：

- 完全无人监督的消费者代办。
- 支付、金融交易、法律提交等不可逆动作自动执行。
- 复杂验证码绕过。
- 面向公开互联网的搜索引擎。
- 取代所有 API 集成。
- 通用桌面操作系统级 Computer Use。

---

## 8. 功能需求

### 8.1 Session Manager

#### P0

- 创建独立浏览器 session。
- 支持 persistent profile 与 ephemeral profile。
- 支持 tab 管理。
- 支持保存、恢复、销毁 session。
- 支持 storage state 导入/导出。
- 支持任务级隔离，避免多个 Agent 共享同一 cookie/profile。

#### P1

- 支持 session clone。
- 支持 profile vault。
- 支持远程浏览器 worker pool。
- 支持 browser extension 接管已有浏览器会话。

#### P2

- 支持跨设备 handoff。
- 支持企业级 browser fleet 调度。

---

### 8.2 Observe Layer

#### P0

- 获取页面标题、URL、tab 状态、加载状态。
- 获取 accessibility snapshot / DOM summary。
- 获取 screenshot。
- 提取主要可操作元素：按钮、输入框、链接、表格、菜单、弹窗。
- 标记页面是否稳定：network idle、DOM mutation、loading indicator、screenshot diff。

#### P1

- 输出语义化页面区域：导航、主内容、表单、表格、侧栏、弹窗。
- 自动压缩大型页面 snapshot。
- 识别常见干扰：cookie 弹窗、广告、toast、modal、loading skeleton。
- 建立 screenshot region 与 semantic element 的映射。

#### P2

- 站点级页面类型识别。
- 长期学习某个 SaaS 的页面结构。
- 多模态页面理解模型接入。

---

### 8.3 Action Router

#### P0

- 接受 high-level action intent：open、click、fill、select、upload、download、scroll、back、wait。
- 基于 role/name/text/selector/bbox/ref 多信号定位目标。
- 执行动作前重新 observe，避免旧 ref 失效。
- 执行动作后等待页面稳定。
- 记录 action result。

#### P1

- 自动 retry：元素不可见、被遮挡、页面未稳定、旧引用失效。
- fallback 策略：semantic ref → selector → text match → coordinate。
- 支持 action dry-run。
- 支持 action diff：动作前后页面变化对比。

#### P2

- 从用户演示中学习 action template。
- 自动生成站点 workflow adapter。

---

### 8.4 State Ledger

#### P0

- 为每个任务维护 goal、constraints、known facts、current stage、last actions、open questions。
- 记录每一步 observation、action、result、evidence。
- 支持 task resume。

#### P1

- 维护 state graph：页面节点、动作边、结果状态。
- 自动识别重复路径和死循环。
- 支持 memory compaction，把长 trace 压缩为任务状态。

#### P2

- 支持组织级 workflow memory。
- 支持跨任务复用站点经验。

---

### 8.5 Checkpoint / Replay

#### P0

- 每个关键动作前后自动 checkpoint。
- 保存截图、snapshot、URL、action、network/console 摘要。
- 支持 timeline 回放。

#### P1

- 支持从 checkpoint resume。
- 支持 trace export。
- 支持 failed run 自动生成诊断报告。

#### P2

- 支持确定性 replay。
- 支持多 session replay comparison。

---

### 8.6 Human Handoff

#### P0

- Agent 可主动 pause_for_human。
- 用户可实时接管浏览器。
- 用户完成登录、验证码、敏感输入后，Agent 可从当前页面继续。
- 接管期间敏感输入默认不暴露给 Agent。

#### P1

- 支持 approval card：动作、目标、风险、影响、证据。
- 支持移动端确认。
- 支持接管后自动识别状态变化。

#### P2

- 多级审批。
- 企业审批流集成。

---

### 8.7 Risk Gate / Policy Engine

#### P0

- 动作风险分级：read-only、reversible-write、irreversible-write、payment、legal、credential、external-send。
- 高风险动作需要确认。
- 支持 domain allowlist / blocklist。
- 支持禁用下载、上传、执行 JS、访问本地文件等能力。

#### P1

- Policy DSL。
- 组织级权限模板。
- Prompt injection 检测和不可信内容隔离。
- Secrets vault。

#### P2

- 行为异常检测。
- 合规审计报表。
- 多 Agent 权限委托图。

---

### 8.8 Developer SDK

#### P0

TypeScript SDK：

```ts
const session = await runtime.sessions.create({
  profile: "ops-user-a",
  startUrl: "https://example.com/orders",
  isolation: "strict"
});

const obs = await session.observe({ mode: "semantic" });

await session.act({
  intent: "fill",
  target: { role: "textbox", name: "Order ID" },
  value: "12345"
});

await session.act({
  intent: "click",
  target: { role: "button", name: "Search" }
});

await session.pauseForHuman({ reason: "Please complete 2FA" });

const trace = await session.trace.export();
```

#### P1

- Python SDK。
- MCP server interface。
- Webhook callbacks。
- Workflow template API。

#### P2

- Agent framework adapters。
- Marketplace for site adapters。

---

### 8.9 Dashboard

#### P0

- Live browser view。
- Agent current goal。
- Step timeline。
- Current observation。
- Pause / Resume / Takeover。
- Approve / Reject action。
- Trace download。

#### P1

- Session fleet view。
- Policy editor。
- Workflow editor。
- Run analytics。

#### P2

- Multi-Agent mission control。
- Cross-system workflow map。
- Organization-wide audit center。

---

## 9. 非功能需求

### Reliability

- P0 task completion rate target: >70% on controlled workflows。
- Action grounding success target: >90% on common form/table/admin pages。
- Failed actions must return structured reason。

### Security

- Default sandboxed browser profile。
- No real user browser access unless explicitly enabled。
- Domain allowlist by default for enterprise tasks。
- Secrets isolated from model-visible observation。
- High-risk actions require explicit approval。

### Observability

- Every run produces timeline trace。
- Every action includes before/after observation。
- Every approval is logged。
- Every failure has machine-readable diagnosis。

### Performance

- Semantic observe p95 < 2s on normal admin pages。
- Act + wait p95 < 5s for simple interactions。
- Snapshot compression required for large pages。

### Portability

- Model-agnostic。
- Browser-agnostic where feasible, Chromium first。
- Local and cloud deployment modes。

---

## 10. Success Metrics

### Product Metrics

- Weekly active sessions。
- Completed tasks per user。
- Human intervention rate。
- Approval conversion rate。
- Average time saved per task。
- Repeat workflow creation rate。
- Failed task recoverability rate。

### Technical Metrics

- Observe latency。
- Action grounding success rate。
- Retry success rate。
- Ref/selector invalidation recovery rate。
- Page stability detection accuracy。
- Trace completeness。
- Policy violation prevention rate。

### Business Metrics

- Paid developer seats。
- Enterprise workflows in production。
- Number of connected profiles/domains。
- Gross margin per run。
- Retention by workflow category。

---

## 11. MVP Acceptance Criteria

A successful MVP should demonstrate:

1. A developer can create an isolated browser session through SDK。
2. An Agent can operate a normal login-after admin page through semantic actions。
3. Runtime logs each step with observation, action, result and screenshot。
4. User can pause, take over, complete login/2FA, then resume Agent。
5. High-risk action triggers approval instead of executing automatically。
6. Failed action produces diagnosis and suggested recovery。
7. Full run can be replayed in dashboard。

---

## 12. Strategic Positioning

### Not this

- “An AI browser.”
- “A better web search.”
- “A screenshot-based RPA clone.”
- “A consumer assistant that does everything.”

### This

- **Execution infrastructure for supervised web agents.**
- **A runtime layer between AI intent and messy web software.**
- **The action, trust and memory substrate for digital workers.**

---

## 13. Long-Term Moat

1. **Trace data**：真实网页任务的 action/observation/recovery 数据。
2. **Workflow memory**：每个站点的页面结构、流程路径、失败恢复策略。
3. **Policy layer**：企业级权限、审批、合规和审计。
4. **Runtime reliability**：比裸模型、裸 Playwright、传统 RPA 更稳定。
5. **Developer ecosystem**：SDK、MCP、site adapters、workflow templates。
6. **Human trust UX**：用户能看见、能接管、能确认、能回放。

---

## 14. 最终产品叙事

ActOS turns the web into an executable surface for agents.

It gives AI the missing layer between “I know what to do” and “I did it.”

