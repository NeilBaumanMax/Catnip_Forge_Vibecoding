# Phase 4d 确认执行基线

日期：2026-09-08。起点：`idea_to_production` / `ff60368e`。

## 目标与程序门禁

- 复用现有 Worker 单队列：计划仍由无工具档位生成；只有用户点击“确认并执行”后，绑定该 Handoff 与已校验计划的一次性执行请求才可进入默认执行档位。
- Main 保存短期计划签发记录并校验 requestId、handoffId、计划确已完成、未过期、未执行；Renderer 自造计划、重复确认、失败/取消前确认均拒绝。
- 确认只代表把既有计划交给 Agent 执行，不伪造源码完成、Build、Flash、Serial 或真机成功；结果仍由既有任务状态和真实工具证据判定。
- 本闭环不测试 Access Secret、不调用知乎；没有设备时只完成软件门禁，继续标记 `REAL_HARDWARE_VALIDATION_PENDING`。

## 最小验收

增加共享确认请求/结果、Main IPC、Orchestrator 一次性计划记录与同队列提交、Explore 确认 UI 和专项反例；运行专项、typecheck、Main/Renderer build、队列与 Explore 回归、diff 检查。
