# DWIDE 文档漂移校正 — 2026-09-15

## 授权、范围与恢复点

- 用户先要求从 `catnip-GUAGUA` 最新提交创建并切换到 `DWIDE`，本轮要求“先修正一次文档漂移”。施工仅在当前工作区 `E:\Agent\vibeide\vibeide`。
- 开工提交：`f2449a199b1a92fb644276403a75da116c6fb586`。本地 `DWIDE`、`catnip-GUAGUA` 与只读核对的 `origin/catnip-GUAGUA` 一致；开工时远端尚无 `DWIDE`。
- 恢复点 `backup/pre-phase-doc-sync-20260915` 已创建、推送到 origin，并用 `git ls-remote` 核对为上述完整提交。
- 开工时无已跟踪文件改动。保护三个未跟踪目录：`docs/tutorials/`、`electron/radio/`、`runtime/hardboard/projects/hello_world_esp32s3/.catnip/`；其内容不作为当前分支已完成功能的证据。
- 全部修改均为文档：`AGENTS.md`、`README.md`、`docs/INDEX.md`、`docs/DEV_PROGRESS.md`、`docs/LOG.md`、旧 `docs/HANDOFF.md` / `docs/ARCHITECTURE.md` 的入口提示，以及 construction 中的接力、历史接力副本、状态报告、主约束、计划、分层契约、工具策略、测试记录和本文。产品需求与业务源码不变。

## 校正清单与验收

| 漂移 | 校正方式 | 依据 |
| --- | --- | --- |
| 施工入口仍指定 idea_to_production / catnip-GUAGUA | 当前入口统一为 DWIDE，历史分支保留日期 | 本轮用户指令、动态 Git |
| 多段“当前/最新”相互覆盖 | HANDOFF 汇总当前状态；旧全文留在同目录历史副本；状态报告/进度/计划显式区分日期 | 提交与历史记录 |
| README 分发旧 win-unpacked、Phase 13 被当最新包 | 当前路径为 `electron/dist-package/Catnip Forge`；最近发布证据标注 2026-09-12、4,502,227,001 字节 | `pack_win_unpacked.cjs`、TEST_METRICS |
| 五工作区、可切换主题、旧 UI 阶段描述 | 六工作区、正常桌面默认探索、固定深色、150% 缩放适配 | BrowserPanel / App / 布局门禁 |
| 把窗口可见、历史 Secret 配置或包成功当完整验收 | 区分历史联调、窗口可见性、新用户连接和实机闭环 | 2026-09-09 / 12 验证记录 |
| Skill 小站打开网页被当成本地安装完成 | 保留下载安装桥待完成状态；已跟踪标准 Skill 为 9 个 | BrowserPanel / Skill Manager / Git 文件列表 |
| 历史 shell 故障被当固定环境规则 | 工具策略改为按本次实际权限判定 | 本轮默认只读 shell 可用；Git 写入/远端操作需升级 |

验收包括文档链接、当前摘要与源码一致性、历史保留、文档修改范围、`git diff --check`，并按仓库基线执行 Runtime/Electron 类型检查、Runtime/Main/Renderer 构建和相关离线 verify 脚本。完整命令、首次失败与后续结果回写 [TEST_METRICS](TEST_METRICS.md)。本轮不重打 Windows 包，不启动真实搜索/模型/硬件流程。

## Review 与结果

- 当前入口统一了 DWIDE、六工作区、固定深色、阶段进展、交付路径和验证边界；原 HANDOFF 全文保留，仅加归档提示。状态报告、计划和累计进度的旧条目已明确标为历史。
- Runtime/Electron 类型检查、Runtime/Main/Renderer 构建、Explore 静态契约、官方 Skill 文件/filter、版本检查，共 8 项 npm 检查通过；Renderer 保留既有 chunk 警告。
- 一次性文档审计修正 fenced shell 注释被误当标题的问题后通过；历史副本与基线内容比较通过，相对链接无缺失。Review 补正 README 第二处旧包路径，保证 LOG 只追加、Product Truth 和业务源码未改变。
- 最近发布与网络/硬件验收仅引用既有带日期记录，不以本轮构建或文档修改升级其完成状态。完整失败/后续结果见 TEST_METRICS。
- 本轮遵循文档修改 → Review → 基线/文档检查 → 精确暂存 → Commit → Push → 远端核对。最终提交和远端一致性在提交后动态核对，不预写本提交自身 hash；后续从 Git 获取，收尾回复提供实际值。

## 一次性文档审计命令

在仓库根目录 PowerShell 执行。该命令只读文件/Git，不成为产品测试套件；首次失败版本对 `body` 直接统计标题，修正后改为排除 fenced code 的 `prose`。相对链接仅检查文件目标存在，不检查 fragment 或外部网站。

```powershell
@'
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const cp = require('node:child_process');
const base = 'f2449a199b1a92fb644276403a75da116c6fb586';
const git = args => cp.execFileSync('git', args, {encoding:'utf8', stdio:['ignore','pipe','pipe']});
const norm = text => text.replace(/\r\n/g, '\n').trimEnd();
const changed = git(['diff','--name-only',base]).trim().split('\n').filter(Boolean);
const added = ['docs/construction/DWIDE_DOC_SYNC_20260915.md','docs/construction/HANDOFF_HISTORY_THROUGH_20260912.md'];
const files = [...new Set([...changed,...added])];
assert(files.every(file => file.endsWith('.md')), 'Only Markdown may change');
assert(!files.includes('docs/product/PRODUCT_REQUIREMENTS.md'), 'Product requirements unchanged');
let checked = 0;
const oldMissing = [];
const errors = [];
for (const file of files) {
  const body = fs.readFileSync(file, 'utf8');
  assert(!body.includes('\uFFFD'), 'UTF8 replacement character: '+file);
  const prose = body.replace(/^```[^\n]*\n[\s\S]*?^```[ \t]*$/gm, '');
  assert.equal((prose.match(/^# /gm) || []).length, 1, 'one document title: '+file);
  let original = '';
  if (!added.includes(file)) original = git(['show',base+':'+file]);
  if (file.includes('HANDOFF_HISTORY_')) original = git(['show',base+':docs/construction/HANDOFF.md']);
  for (const match of prose.matchAll(/!?\[[^\]\n]*\]\(([^)\n]+)\)/g)) {
    const target = match[1].replace(/^<|>$/g,'');
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    const relative = decodeURIComponent(target.split('#')[0]);
    if (!relative) continue;
    checked++;
    if (!fs.existsSync(path.resolve(path.dirname(file),relative))) {
      (original.includes(match[0]) ? oldMissing : errors).push(file+': '+relative);
    }
  }
}
const archive = norm(fs.readFileSync(added[1],'utf8')).split('\n');
assert(archive[2].startsWith('> '), 'archive must have dated disclaimer');
archive.splice(2,2);
assert.equal(archive.join('\n'),norm(git(['show',base+':docs/construction/HANDOFF.md'])), 'historical handoff preserved');
assert(norm(fs.readFileSync('docs/LOG.md','utf8')).startsWith(norm(git(['show',base+':docs/LOG.md']))),'LOG remains append-only');
const tabs = fs.readFileSync('electron/src/renderer/components/BrowserPanel.tsx','utf8').match(/data-tour-id="tab-/g) || [];
assert.equal(tabs.length,6);
assert.equal(JSON.parse(fs.readFileSync('config/version.json','utf8')).packageVersion,'2.0.0-7201');
assert.equal(git(['branch','--show-current']).trim(),'DWIDE');
console.log(JSON.stringify({documents:files.length,relativeLinksChecked:checked,existingMissingLinks:oldMissing,newMissingLinks:errors,historicalHandoff:'preserved',log:'append-only',trackedChanges:'Markdown only'},null,2));
assert.equal(errors.length,0,'new broken links');
'@ | node
```
