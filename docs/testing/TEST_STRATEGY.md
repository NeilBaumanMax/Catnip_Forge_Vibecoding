# Test Strategy
Lifecycle: ACTIVE · Development verification，产品硬件 Build 单独记证据。

| Level | 触发 | 范围 |
| --- | --- | --- |
| FAST | 每个 patch | 相关类型/静态契约、导航、架构、开发工具快速测试；不生成生产包 |
| MODULE | 目标模块行为变化 | 相关已有专项；Main-dependent 测试共享一次 Main 编译 |
| INTEGRATION | IPC/跨模块/公共类型变化、未知路径 | 更广离线组合；单次聚合按构建依赖去重 |
| RELEASE | 明确准备发布 | Runtime/Renderer生产构建、打包、packaged首启/restart、真实环境/硬件验收 |

旧 verify:* 命令保持原字符串/用户语义；新增入口均用 `npm.cmd --prefix electron run <name>`：

| 入口 | 内容 |
| --- | --- |
| verify:fast | Main/preload + Runtime typecheck、知识地图、开发工具测试、版本/Explore静态契约；零build |
| check:architecture / check:maintainability | 四项AST导入规则 / 尺寸与增长警报；均已进入FAST |
| verify:explore-core / verify:explore | 核心request/权限/交接三项；完整版再含session/knowledge/context/连接/静态UI |
| verify:project / verify:serial | 工程隔离/路径；共享串口mock |
| verify:task-history | Renderer事件合并/任务历史纯计算、相关类型严格检查；零Main build |
| verify:explore-history | 历史列表严格TSX、SSR渲染与受控回调；零Main build，已纳入Explore/INTEGRATION |
| verify:explore-history-browser | 独立React浏览器夹具：宽/窄布局、输入/焦点/按钮；需已安装Chromium，可设置CATNIP_TEST_CHROMIUM；不下载、不连产品CDP、不自动加入离线组 |
| verify:explore-knowledge-preview | 知识首页严格TSX、SSR条件渲染与受控回调；零Main build，纳入Explore/INTEGRATION |
| verify:explore-knowledge-preview-browser | 独立React浏览器夹具：宽/窄、原对话、验证表单与空态；浏览器要求同上，不自动加入离线组 |
| verify:explore-analysis-results | 灵感/诊断结果严格TSX、状态/来源组合与计划回调；零Main build，纳入Explore/INTEGRATION |
| verify:explore-plan-view | 只读计划严格TSX、选择回退/进度/步骤/风险/artifact按钮；拒绝吸收IPC/确认逻辑，零Main build |
| verify:skills-offline | vendor文件/filter与连接门禁；不执行真实部署 |
| verify:integration | 上述离线组去重组合；Main只build一次 |
| verify:changed -- --plan | HEAD的staged/unstaged及untracked路由；--base另加merge-base至HEAD；只输出计划不执行 |

`--files <repo-relative-path...>` 可模拟任务路由（须放最后）；`--plan` 也可用于各聚合组。
计划先对全部路径路由，再将过长路径列表的显示限制为40项并列总数/省略数；`--full` 可查看全量。用户未跟踪目录不删除、不忽略，未知路径仍触发升级。
源码静态类型范围需诚实：现有 electron/tsconfig.json 排除Renderer，Vite生产build也不是TSX严格类型检查；独立Renderer类型门禁仍属债务，不写作PASS。
聚合每次显式Main build，不做跨运行缓存；串行子测试120秒超时/非零退出立即停止，其余标NOT RUN。
verify:skills会真实部署，verify:explore-zhihu-status会读取当时CLI状态，verify:project-session-ui需要已启动成品CDP；这些及其他CDP/packaged/live命令不自动执行。地图保留相关原测试推荐，changed计划明确列NOT RUN requirements。新聚合的connection专项只检查参数与Windows XAML构造，无实际Secret/安装/网络请求。
地图 tests 使用 electron/package.json 已存在的脚本名；fast/module/integration 是建议，不证明真实环境成功。
UNKNOWN 必须扩至 INTEGRATION；发布/实机检查列为显式 requirements，不由 changed 自动执行。
无变更时也运行 FAST；不识别不能返回空验证成功。
测试可能写临时目录，先审副作用；共享夹具串行，失败保留完整 stderr/根因/复测。
不机械 npm install：仅 node_modules 缺失、manifest/lock变化或明确 dependency repair 时评估安装必要性。
CURRENT_TEST_STATUS 只更新各项当前结论/证据目标；详细命令进入 evidence/TASK-XXXX.md。
本轮开发基础设施回归需要最终类型/Main/Renderer/Runtime构建；以后普通 UI patch 不默认做 production build。
