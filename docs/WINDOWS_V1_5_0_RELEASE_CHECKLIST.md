# Windows v1.5.0 便携版发布检查

更新日期：2026-08-08

## 版本映射

- 对外发布标签：`v1.5.0`
- 内部构建号：`7201`
- npm/应用包版本：`1.0.0-7201`
- Windows PE 文件版本：`1.0.0.7201`
- 正式入口：`electron/dist-package/win-unpacked/Catnip Forge.exe`

对外标签与内部文件版本分开管理。本次没有虚构新的 PE 构建号；现有 Build 7201 以 v1.5.0 标签发布。

## 2026-08-08 重建结果

- Runtime 与 Electron TypeScript typecheck 通过。
- Runtime、Electron main 和 Renderer 生产构建通过；Vite 仅报告 Monaco 大块资源提示，不影响退出码。
- `pack:win` 完整重建 `win-unpacked` 成功，共 41,920 个文件、`4,464,201,281` 字节。
- `verify:version` 与 `verify:release` 通过；成品对外版本为 `v1.5.0`，Node 为 `v22.14.0`，Claude Code 为 `2.1.167`。
- `resources/app.asar` SHA-256 为 `7CEB034B634238D25CDB8552376E3718D6F6679598325ED9B0679C71630095B3`。
- 无 Key 首启 smoke 通过：配置弹窗、Skill 按钮、品牌资源、英文定位、Playwright、占位 Key 拒绝与 Key 路径均正确。
- 保存一次性测试 Key 后自动重启闭环通过；新进程为 `apiKeyReady=true`、`firstRun=false`，测试 Key 随后按内容校验并删除。
- 验收结束后，成品测试进程为 0，`resources/apikey.txt` 与 `resources/qwen-apikey.txt` 均不存在。

## 随包 Python 验收

- electron-builder 将完整 `_bundled/python` 复制到 `resources/runtime/python`，并补齐 `Scripts/python.exe`、`Scripts/python312.dll` 与专用 `Scripts/python312._pth`。
- 根解释器和 Scripts 启动器均能从随包 `Lib/site-packages` 导入 `serial`、`click.core`、`idf_component_manager` 与 `esptool`。
- 发布门禁使用 `PYTHONHOME`、`PYTHONNOUSERSITE=1` 和随包 `IDF_PYTHON_ENV_PATH`，并逐个断言模块路径位于成品 Python 根目录内。
- `pyserial 3.5` 与 `ESP-IDF v5.4.3` 实测通过；成品 Runtime 在真实工作目录下返回的 Python 路径为 `resources/runtime/python/python.exe`，未引用系统 Python、用户 site-packages 或旧 ESP-IDF 虚拟环境。

## 尚未替代的人工验收

- 本轮未连接真实 ESP/USB-UART，不把 Python/IDF 探针当作真实硬件烧录与串口闭环。
- 最终客户机分发、SmartScreen、真实 API Key、真实云服务异常和长时间连续会话仍需单独验收。
