# TASK-EXPLORE-002 — Extract Explore knowledge preview
Lifecycle: ARCHIVED
Status: completed
Owner: Development Agent
Mode: Maintenance

## Intent
继续拆小 ExplorePanel，把首页知识列表、原对话展开和真实验证表单提取为可独立定位的受控展示组件。
## Target Modules
explore；dev-infrastructure（局部验证/导航）。预计2个产品源码文件，0跨层边界，0新依赖。
## Allowed Write Scope
ExplorePanel.tsx、components/explore/ExploreKnowledgePreview.tsx；专项测试与npm别名、离线验证组、project-map/路由测试、Explore Contract、维护尺寸、CURRENT、本Task/evidence。
## Read-only Dependencies
common/explore.ts 的KnowledgeCard类型、explore.less、React/lucide；verificationLabel继续由父组件复用。
## Forbidden Scope
Main/Worker/Runtime、知识存储/选择算法、IPC、验证记录语义、CSS/视觉设计、用户未跟踪目录。
## Relevant Product Truth
[Product Truth](../../product/PRODUCT_REQUIREMENTS.md) §1 历史知识需用户选择才进入Context、收藏和历史删除互不级联、真实验证证据边界。
## Relevant Contracts
[Explore](../../modules/explore/CONTRACT.md)、[Dev Infrastructure](../../modules/dev-infrastructure/CONTRACT.md)；[Layer](../../construction/LAYER_CONTRACT.md) Renderer边界及跨层不变量。
## Relevant ADRs
[ADR-0001](../../decisions/ADR-0001-development-knowledge.md)、[ADR-0002](../../decisions/ADR-0002-development-verification.md)。
## Relevant Source Files
ExplorePanel 的 explore-knowledge-preview JSX、verificationLabel、begin/save/delete/open函数；新组件只消费父传值和回调。
## Relevant Tests
修改前后同一严格TSX/SSR/回调特征；隔离浏览器宽窄/展开/表单交互；FAST静态契约；验证配置变化后离线INTEGRATION。
## Invariants
最多6张卡、顺序/状态/工程/最近验证不变；原对话角色/时间与空态不变；验证说明必填、保存中禁用、状态参数和删除/open参数不变；父组件仍持有状态/IPC。
## Acceptance Criteria
原/新渲染及交互等价；父组件除section/import不变；knowledge-ui focus直接定位局部组件；无依赖/业务/样式变化；精确review/commit/push/核hash。
## Validation Commands
`node electron/scripts/verify_explore_knowledge_preview.cjs`；独立Chromium专项；`npm.cmd --prefix electron run verify:integration`；`node scripts/dev/context.cjs explore --focus knowledge-ui`。完整结果进入evidence。
## Rollback Point
e9432a40573c71614cde44c2c48cef146db7bec2；backup/pre-phase-explore-knowledge-20260915已推origin并核hash一致。
## Risks
复杂条件渲染或受控字段遗漏、旧静态检查仍盯父文件。根因不在局部展示时停止扩大范围；持久化/选择逻辑另开Task。
## Explicit Exclusions
不改Runtime Agent，不修改产品功能/需求，不生产构建/打包/实机，不连接用户运行中的App。

## Outcome
ExplorePanel 1731→1676行；知识预览/原对话/验证表单成为106行受控组件。原/新5组特征、SSR、父文件反向还原、3组Chromium截图与交互一致；INTEGRATION 29步20.233s、Main构建一次。两次首失败均为新测试基线/参数读取错误，局部修复后通过。后续纯展示从knowledge-ui进入；存储/自动发现/Context选择另开Task。完整记录见[任务evidence](../../testing/evidence/TASK-EXPLORE-002.md)。
