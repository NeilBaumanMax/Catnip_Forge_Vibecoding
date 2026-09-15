# Task Evidence
Lifecycle: ACTIVE（目录规则）
一任务一份 TASK-XXXX.md，包含对象提交、完整命令、首次失败/stderr、根因、repair或rollback决定和复测结果。
不写凭据，不复制全局日志。区分 PASS / FAIL / NOT RUN / PENDING，注明 mock / live / package。
历史 TEST_METRICS 仍保留原路径，仅调查时读取；新证据不追加到它。
