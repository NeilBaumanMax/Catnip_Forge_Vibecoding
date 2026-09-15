# Workspace / Editor
Lifecycle: ACTIVE · Module: workspace-editor

## Owns
受控工程/参考/Skill目录展示、Monaco和文件编辑操作。
## Does Not Own
其他模块的业务与全局状态；不另建Agent/Skill/任务系统。当前状态只引用[CURRENT](../../state/CURRENT.md)。
## Allowed Dependencies
[project-session](../project-session/CONTRACT.md)、[ipc](../ipc/CONTRACT.md)、[skills](../skills/CONTRACT.md)。仅触及接口时加载依赖Contract，不递归读全部。
## Forbidden Dependencies
runtime-mcp 的直接越层访问；禁止[Layer Contract](../../construction/LAYER_CONTRACT.md)列出的跨层行为。地图依赖是导航级职责，不能代替源码导入图。
## Public Interfaces
workbench:*；readWorkbenchFile；editor props。
入口：[workbench.ts](../../../electron/src/main/workbench.ts)、[WorkspacePanel.tsx](../../../electron/src/renderer/components/WorkspacePanel.tsx)、[CodeEditor.tsx](../../../electron/src/renderer/components/CodeEditor.tsx)、[monaco.ts](../../../electron/src/renderer/monaco.ts)。
## Invariants
受控根/文件路径边界；工程切换处理未保存编辑；保留Monaco和现有资源仓库。全局规则引用Layer §跨层不变量；不复制另一套全局契约。
## Relevant Tests
FAST：verify:project-session-ui。
MODULE：verify:project-session。
以上为electron既有脚本；Runtime改动加Runtime typecheck。UI几何/真实设备/API验证按Task显式安排，不由静态通过推断。
## Related ADRs
[ADR-0001](../../decisions/ADR-0001-development-knowledge.md)。历史调查才加载旧施工与证据。
