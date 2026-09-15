# TASK-DEV-MAINT-001 Evidence
Lifecycle: ACTIVE（任务结束后 ARCHIVED）
## Baseline
- 71d63d5d，DWIDE / origin/DWIDE一致；独立计划 bf0192da 已推送。
- 10必读/1301行；31个verify中12个重复build:main；Explore核心组三次build。
- 预检完整命令和恢复点见施工基线。新知识目录尚不存在产生rg路径提示；随后逐项建立。PowerShell glob调用改为rg -g，不是产品回归。
## Phase 1
- PASS：17个模块、17份短Contract；Node内置JSON解析YAML兼容子集，逐项检查code/docs/decisions路径、模块依赖和所有test别名均存在。
- PASS：8份旧全局文档移除新增生命周期提示后与bf0192da原文逐字比较（统一CRLF/LF），历史正文完整保留。
- PASS：`git -c core.safecrlf=false diff --check`。本阶段仅知识/规则文件，无产品源码或依赖变化；未重复构建同一产品基线。
- 规则转换：本阶段提交后按新ACTIVE AGENTS/WORKFLOW执行，不再向旧全局日志复制本记录。
