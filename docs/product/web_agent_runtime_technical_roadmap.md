# 技术 Roadmap：ActOS Web Agent Runtime

> 目标：构建一个 model-agnostic、browser-native、policy-controlled、human-supervised 的 Web Agent Runtime。

---

## 0. 最终架构总览

```text
Natural Language Goal
        |
        v
Agent / Planner Layer
        |
        v
ActOS Control Plane
  - Mission Orchestrator
  - Policy Engine
  - Identity / Profile Manager
  - Human Approval System
  - Run Scheduler
        |
        v
ActOS Data Plane
  - Browser Session Runtime
  - Observe Layer
  - Action Router
  - Web World Model
  - State Ledger
  - Recovery Engine
  - Trace Store
        |
        v
Execution Adapters
  - Playwright / CDP
  - Playwright MCP
  - Browser Extension
  - Computer Use / Screenshot Control
  - Direct API Connectors
  - Terminal / File / Email Adapters
        |
        v
Websites / SaaS / Portals / Internal Tools
```

---

## 1. 核心抽象

### 1.1 Mission

一个 mission 是用户提交的可执行目标。

```yaml
mission:
  id: m_001
  goal: "导出昨天的退款失败订单并生成处理清单"
  constraints:
    domains: ["admin.example.com", "logistics.example.com"]
    risk_policy: "supervised"
  status: running
  owner: user_123
```

### 1.2 Session

一个 session 是 Agent 的网页运行容器。

```yaml
session:
  id: s_001
  browser: chromium
  profile: ops_user_a
  isolation: strict
  tabs:
    - id: t_001
      url: "https://admin.example.com/orders"
  state: active
```

### 1.3 Observation

Observation 是压缩后的页面状态，不是原始截图或原始 DOM。

```yaml
observation:
  page:
    title: "订单管理"
    url: "/orders"
    stable: true
    loading: false
  regions:
    - id: r_search
      type: search_panel
    - id: r_table
      type: data_table
  actions:
    - id: a_search
      role: button
      name: "查询"
      enabled: true
  warnings:
    - type: toast
      text: "导出任务正在生成"
```

### 1.4 Action Intent

Agent 输出的是 action intent，而不是底层坐标。

```yaml
action:
  intent: click
  target:
    role: button
    name: "查询"
  risk: low
```

### 1.5 Trace Event

所有行为写入不可变 ledger。

```yaml
event:
  step: 12
  type: action_result
  action: click_search
  before_observation: obs_011
  after_observation: obs_012
  result: success
  evidence:
    screenshot: gs://trace/step_12.png
```

---

## 2. 分层架构

### 2.1 Agent / Planner Layer

职责：

- 接收用户目标。
- 拆解任务。
- 调用 Runtime 的 observe / act / ask_human / verify。
- 维护高层计划。

原则：Planner 不直接控制 DOM、坐标、浏览器 profile、密钥或权限。

---

### 2.2 Mission Orchestrator

职责：

- Mission lifecycle：create、start、pause、resume、cancel、complete。
- Task decomposition。
- Multi-session scheduling。
- Sub-agent assignment。
- SLA / timeout / budget control。

关键设计：

- Mission 是长生命周期对象。
- Session 是短/中生命周期执行容器。
- Agent 是可替换推理组件。

---

### 2.3 Browser Session Runtime

职责：

- 创建隔离浏览器环境。
- 管理 profile、cookie、localStorage、downloads、uploads。
- 管理 tabs、windows、viewport、device profile。
- 支持 headed、headless、remote stream。
- 支持 profile snapshot / restore。

实现建议：

- Chromium first。
- Playwright / CDP 作为底层主控。
- 每个 session 对应独立 browser context 或 persistent profile。
- browser worker 运行在 sandbox/container。

---

### 2.4 Observe Layer

输入：browser page、DOM、accessibility tree、screenshot、network、console、storage。

输出：Agent-friendly observation。

模块：

1. Snapshot Collector
2. DOM Extractor
3. Accessibility Parser
4. Screenshot Capturer
5. Region Segmenter
6. Action Candidate Extractor
7. Page Stability Detector
8. Noise Filter
9. Observation Compressor

优先级：

```text
DOM / AX / network / console > screenshot > coordinate inference
```

---

### 2.5 Web World Model

将网页从“页面”抽象成“可操作世界”。

包含：

- Page type：login、dashboard、list、detail、form、checkout、settings。
- Entities：order、invoice、customer、ticket、report、config。
- Capabilities：search、filter、export、upload、submit、approve。
- State：loading、authenticated、empty、error、success、blocked。
- Transitions：click search → results table；click export → file download。

长期目标：

- 为每个站点学习可复用的 workflow map。
- 将 UI 操作逐步提升为 semantic API。

---

### 2.6 Action Router

职责：把 high-level action intent grounding 到真实操作。

Pipeline：

```text
Action Intent
  -> Policy pre-check
  -> Fresh observe
  -> Target resolution
  -> Feasibility check
  -> Execution
  -> Wait for stability
  -> Verify delta
  -> Ledger write
```

Target resolution 信号：

1. Stable element id
2. Accessibility role/name
3. DOM selector
4. Text match
5. Relative layout
6. Screenshot bbox
7. Coordinate fallback

---

### 2.7 Stability / Wait Engine

判断动作之后页面是否稳定。

信号：

- network idle
- DOM mutation quiet period
- URL stable
- known loading indicators disappear
- screenshot diff below threshold
- action-specific condition met
- download started/completed
- modal appeared/disappeared

输出：

```yaml
stability:
  stable: true
  reason: "network_idle_and_dom_quiet"
  elapsed_ms: 1830
```

---

### 2.8 Verification Engine

Agent 不能只执行动作，还要确认目标推进。

验证类型：

- Text visible / invisible
- URL changed / contains
- File downloaded
- Table row count changed
- Form value persisted
- API response success
- Console error absent
- Screenshot diff expected
- User-defined assertion

---

### 2.9 Recovery Engine

失败不是异常情况，而是 Runtime 的核心路径。

失败类型：

- target_not_found
- target_disabled
- target_obscured
- page_unstable
- login_required
- captcha_required
- network_error
- permission_denied
- unexpected_modal
- stale_reference
- action_no_effect

恢复策略：

- re-observe
- scroll/search within page
- close modal
- retry with new target
- fallback to keyboard
- fallback to vision coordinate
- ask human
- rollback checkpoint
- replan

---

### 2.10 Human Handoff

Human Handoff 是 trust layer，不是失败兜底。

能力：

- Agent 主动请求接管。
- Runtime 因 policy 强制接管。
- 用户主动 pause。
- 用户在 live browser 中操作。
- 用户输入敏感信息时对 Agent 屏蔽。
- Agent 从接管后的当前状态继续。

---

### 2.11 Policy Engine

Policy 作用在 mission、session、observation、action、output 五个层面。

Policy 示例：

```yaml
policy:
  domains:
    allow: ["*.example.com"]
    block: ["bank.example.com"]
  actions:
    auto_allow:
      - read
      - search
      - download_report
    require_approval:
      - submit
      - send_email
      - delete
      - payment
      - external_upload
    deny:
      - run_unsafe_js
      - access_local_files
```

---

### 2.12 Trace Store

Trace 是产品护城河。

存储内容：

- Mission metadata
- Session metadata
- Observation snapshots
- Screenshots
- Action intents
- Low-level execution details
- Network/console summaries
- Approval records
- Failure diagnosis
- Recovery path
- Final evidence

支持：

- Replay
- Diff
- Export
- Audit
- Training data generation

---

## 3. 技术 Roadmap

## Phase 0：Architecture Spike，2-4 周

目标：验证核心技术路径。

交付：

- Playwright/CDP 控制浏览器。
- 获取 AX snapshot、DOM summary、screenshot。
- 简单 observe schema。
- 简单 act schema：click/fill/wait。
- 每步生成 trace JSON。
- 本地 demo：登录后页面搜索并导出文件。

关键问题：

- 页面状态压缩怎么做？
- ref/selector 失效后如何重新定位？
- session/profile 如何隔离？
- 人类接管后如何恢复？

---

## Phase 1：Core Runtime MVP，0-3 个月

目标：做出可用的 supervised web agent runtime。

交付：

### Runtime

- Session create/destroy/resume。
- Tab management。
- Semantic observe v1。
- Action router v1。
- Page stability detector v1。
- Trace ledger v1。

### SDK

- TypeScript SDK。
- Basic REST API。
- Local dev server。

### Dashboard

- Live browser stream。
- Step timeline。
- Observation viewer。
- Pause/resume/takeover。

### Safety

- Domain allowlist。
- High-risk keyword/action approval。
- Ephemeral profile default。

验收场景：

- 登录后台后筛选订单。
- 填写简单表单并保存草稿。
- 下载报表。
- 需要验证码时人工接管，完成后 Agent 继续。

---

## Phase 2：Reliability Layer，3-6 个月

目标：从 demo 变成可反复运行的系统。

交付：

- Fresh observe before every action。
- Target resolution 多信号融合。
- Stale ref recovery。
- Modal/toast/cookie banner handling。
- Action retry policy。
- Before/after diff。
- File download/upload manager。
- Failure diagnosis taxonomy。
- Trace replay v1。

指标目标：

- Controlled workflows task completion >70%。
- Common UI action grounding >90%。
- Failed action diagnosis coverage >80%。

---

## Phase 3：Trust / Policy / Enterprise，6-9 个月

目标：让企业敢用。

交付：

- Policy DSL。
- Role-based access control。
- Secrets vault。
- Approval card。
- Audit log export。
- Session recording retention policy。
- Network/domain isolation。
- Prompt injection defense baseline。
- Admin dashboard。

验收场景：

- 企业管理员能限制 Agent 只能访问指定后台。
- Agent 试图执行删除/提交/付款时自动中断并请求确认。
- 审计员能回放完整任务。

---

## Phase 4：Workflow Memory，9-12 个月

目标：从单次执行升级到可复用工作流。

交付：

- Site memory。
- Workflow template。
- Demonstration-to-workflow。
- Reusable page object model。
- State graph。
- Loop detection。
- Run comparison。
- Workflow versioning。

验收场景：

- 用户演示一次后台导出流程，Agent 下次能复用。
- 页面轻微变化后，Runtime 自动修复 selector/ref。
- 同一 workflow 支持每天定时运行和人工抽检。

---

## Phase 5：Multi-Agent / Browser Fleet，12-18 个月

目标：从单 session runtime 升级为 digital worker platform。

交付：

- Browser worker pool。
- Multi-session scheduling。
- Agent concurrency control。
- Profile leasing。
- Queue / retry / timeout / budget。
- Multi-agent coordination。
- Cross-system workflow orchestration。
- Enterprise deployment：cloud / VPC / on-prem。

验收场景：

- 50 个并发 browser sessions。
- 多个供应商门户并行下载账单。
- 失败任务进入人工复核队列。
- 成功任务自动归档证据。

---

## Phase 6：Agent-Native Web Execution Platform，18-24 个月

目标：形成平台和生态。

交付：

- MCP server mode。
- Agent framework adapters。
- Site adapter marketplace。
- Policy marketplace。
- Workflow analytics。
- Enterprise compliance packs。
- API/browser hybrid execution planner。
- Natural-language workflow builder。

战略结果：

- 开发者把 ActOS 当成 Web Agent execution backend。
- 企业把 ActOS 当成数字员工运行时。
- SaaS 厂商开始为 Agent 优化 UI 和语义结构。

---

## 4. 关键技术风险

### 4.1 页面理解不稳定

缓解：结构化信号优先，多模态补充，action 前 fresh observe，失败后重定位。

### 4.2 动作误执行

缓解：intent/action 分层、risk gate、approval、dry-run、before/after verification。

### 4.3 Prompt Injection

缓解：网页内容视为 untrusted data；用户/系统指令与网页内容隔离；高风险动作要求确认；敏感工具不暴露给网页上下文。

### 4.4 登录态和隐私

缓解：profile vault、secret isolation、human handoff blind mode、session expiration、audit logs。

### 4.5 成本和延迟

缓解：snapshot compression、selective screenshot、event-driven observe、browser pool warm start。

### 4.6 网站反自动化

缓解：不绕过验证码；明确用户授权；human takeover；优先用于授权业务系统和企业内部流程。

---

## 5. 核心技术栈建议

### Runtime

- Node.js / TypeScript for Playwright-native control。
- Rust or Go for high-throughput control plane if needed later。
- PostgreSQL for mission/session/trace metadata。
- Object storage for screenshots/videos/downloads。
- Redis / queue for scheduling。
- OpenTelemetry for observability。

### Browser Execution

- Playwright + CDP。
- Chromium first。
- Containerized browser workers。
- Optional browser extension mode for human-owned browser takeover。

### AI Layer

- Model-agnostic LLM gateway。
- Tool-call interface。
- Observation compression model。
- Optional vision model for screenshot fallback。

### Security

- Secrets vault。
- Per-session network policy。
- Domain allowlist/blocklist。
- Policy DSL engine。
- Immutable audit log。

---

## 6. API Sketch

```ts
import { ActOS } from "@actos/runtime";

const actos = new ActOS({ apiKey: process.env.ACTOS_API_KEY });

const mission = await actos.missions.create({
  goal: "Export failed refunds from yesterday and prepare a review table",
  policy: "supervised-enterprise",
});

const session = await mission.sessions.create({
  profile: "ops-user-a",
  startUrl: "https://admin.example.com/orders",
  isolation: "strict",
});

let obs = await session.observe({ mode: "semantic" });

await session.act({
  intent: "fill",
  target: { role: "textbox", name: "Order status" },
  value: "Refund failed",
});

await session.act({
  intent: "click",
  target: { role: "button", name: "Search" },
});

await session.verify({
  expect: { textVisible: "Refund failed" },
});

await session.checkpoint("results-loaded");

const trace = await mission.trace.export({ format: "html" });
```

---

## 7. 最终技术目标

ActOS 的长期技术目标不是让模型直接“使用浏览器”，而是定义一套稳定抽象：

```text
Goal
  -> Mission
  -> Observation
  -> Action Intent
  -> Grounded Action
  -> Verified State Change
  -> Auditable Trace
```

当这个抽象稳定后，网页 UI 就会从人类点击界面，变成 Agent 可执行的数字世界表面。

