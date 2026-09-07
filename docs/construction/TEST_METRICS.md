# 测试度量与证据

统计单位：命令目标，不把 smoke 内 assert 数伪报为测试用例数量。失败尝试保留；未执行不算通过。日期 2026-09-07；基线 f6e20e8e。

## Phase 0

| 命令（仓库根目录，Windows） | 通过 | 失败 | 未验证 | 说明 |
| --- | ---: | ---: | ---: | --- |
| npm.cmd --prefix runtime run typecheck | 1 | 0 | 0 | exit 0 |
| npm.cmd --prefix runtime run build | 1 | 0 | 0 | exit 0 |
| npm.cmd --prefix electron run typecheck | 1 | 0 | 0 | exit 0 |
| npm.cmd --prefix electron run build:main | 1 | 0 | 0 | exit 0 |
| npm.cmd --prefix electron run build:renderer | 1 | 0 | 0 | exit 0，55.82s；chunk >500KB 提示，未改配置掩盖 |
| npm.cmd --prefix electron run verify:skills | 1 | 0 | 0 | 12 deployed；包括支持树及显式 refs 契约 |
| npm.cmd --prefix electron run verify:hardboard | 1 | 0 | 0 | 上下文规则，不是真编译 |
| npm.cmd --prefix electron run verify:task-queue | 1 | 0 | 0 | 离线单队列回归 |
| npm.cmd --prefix electron run verify:chat-presentation | 1 | 0 | 0 | 聊天事件解析 |
| npm.cmd --prefix electron run verify:serial-monitor | 1 | 0 | 0 | 共享会话 mock，不触板；内部再次 build:main 不重复计目标 |
| $env:PYTHONUTF8='1'; python -m pytest tests/test_project.py -q | 0 | 1 | 0 | 第一次启动失败：系统 Python 无 pytest |
| $env:PYTHONUTF8='1'; & .\_bundled\python\python.exe -m pytest tests/test_project.py -q | 0 | 1 | 0 | 第二次换已有随包解释器，仍无 pytest；未安装依赖、未跑到4个断言 |
| git diff --check | 1 | 0 | 0 | 基线无改动；文档提交前再查 |
| IDF 环境/版本探针（见下） | 1 | 0 | 0 | v5.4.3；缺 IDF 自身 .git，回读 source version |
| 官方 CLI status/真实搜索 | 0 | 0 | 1 | Phase 1 执行 status；无 Secret 证据 |
| 真实 ESP Build / Flash / Serial | 0 | 0 | 1 | REAL_HARDWARE_VALIDATION_PENDING |
| 本轮 Windows 重打包/冷启动 | 0 | 0 | 1 | Phase 6；旧包不当本轮证据 |

合计：12 个检查目标通过、2 次测试启动失败、3 组待验证。Python 结构测试仍未通过；这属于缺失测试依赖，不能写“全测试通过”。旧 `tests/test_scaffold.py` 未执行，不修复/删除冻结区。

IDF 探针命令：

```powershell
@'
import {getHardboardEnvStatus,buildIdfEnv} from './runtime/dist/hardboard/env.js';
import {execFileSync} from 'node:child_process';
const e=getHardboardEnvStatus();
if(!e.python || !e.idfPy || !e.idfPath) process.exit(1);
console.log(execFileSync(e.python,[e.idfPy,'--version'],{env:buildIdfEnv(e.idfPath,e.idfVersion,undefined,e.python),encoding:'utf8',timeout:30000,windowsHide:true}).trim());
'@ | node --input-type=module -
```

## 后续测试策略

- Phase 1：真实 vendor 文件 hash、标准支持树、@ refs/Worker 指令、旧 skills 回归、官方 status、实际打包 filter。真实 Agent tool invocation 单列，不以 mock 冒充。
- Phase 2：domain 合法/非法对象、持久化/重启/坏文件、IPC 校验、知识拒绝不注入。
- Phase 3：官方搜索/来源、受限分析、结构化失败拒绝、Handoff 计划和确认前零改动；UI 沿用 CDP。
- Phase 4：有限 Context、跨项目/过期记录、取消、双来源冲突、确认/取消/队列竞态、真实硬件证据。
- Phase 5：收藏重启、相关发现选择、有效/无效验证记录关联。
- Phase 6：全部相关回归、无 Secret、Windows package 资源与冷启动、两 Demo。

新增/修复失败历史只追加到本文件或 LOG；修复后不得删除第一次失败。

## Phase 0恢复校验（修复编码后的完整记录）

15文档存在/非空、本地链接、D001–D020、A1–A9、业务无diff：1个检查目标通过。Phase 0累计13通过、2次pytest启动失败、3组待验证。此前该命令因审批服务额度耗尽未执行；用户继续后首次实际执行通过。同一源码baseline未机械重跑npm检查。

## Phase 1源核验

| 命令/检查 | 通过 | 失败 | 未验证 | 说明 |
| --- | ---: | ---: | ---: | --- |
| Python zipfile/hashlib安全解包、工作区与git show :path逐文件bytes对比 | 1 | 0 | 0 | 15文件与原ZIP一致 |
| powershell -NoProfile -ExecutionPolicy Bypass -File agent/skills/zhihu/scripts/run.ps1 status | 1 | 0 | 0 | exit0，installed=false/request_install_consent；仅无鉴权边界 |
| CLI安装/实际加载与真实搜索 | 0 | 0 | 1 | 等安装授权，真实搜索另需安全凭据 |
| 宿主兼容/support sync/@zhihu | 0 | 0 | 1 | 未实施 |
| 新Skill实际打包/成品运行 | 0 | 0 | 1 | 未执行 |
| 真实硬件闭环 | 0 | 0 | 1 | REAL_HARDWARE_VALIDATION_PENDING |

Phase 1核心检查2通过、0失败、4组未验证。不把CLI未就绪检查通过称为接入完成。

## 文档编码失败历史

第一次文档写入：Python通过PowerShell默认OutputEncoding管道接收中文，出现问号替换。此前文件存在/链接检查未覆盖文字完整性；Get-Content -Encoding UTF8检查DEV_PROGRESS和PHASE_1_ZHIHU_SKILL实际发现失败。根因不是文件读取编码，而是stdin已丢失字符。
修复：显式设置 $OutputEncoding = [System.Text.UTF8Encoding]::new($false)，从已确认事实重写受影响进度/接力/专项文档，按完整证据重建本测试补充记录；LOG原失败条目保留，追加可读纠正。新增检查拒绝连续问号并检查中文正文；完整命令/结果在LOG追加。此项1次失败另记，不混入核心功能2项通过。

2026-09-07 修复复测：当前6份施工文档中文/连续问号/本地链接检查通过；官方15文件工作区与已提交Git对象再次对比ZIP通过。文档编码项累计1次失败、1次修复通过，失败历史保留。
