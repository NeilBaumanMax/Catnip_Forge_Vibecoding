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

## Phase 0 ???????

1 ??????15 ??/????/D001?D020/A1?A9/??? diff???? 13 ????2 ? pytest ?????3 ???????????????????????????????????????????? baseline ? npm ??/?????????
???? pathlib ??????/???re ?? Markdown ??????????????????? ID?subprocess ?? git diff --name-only ????? diff??? git diff --check?
