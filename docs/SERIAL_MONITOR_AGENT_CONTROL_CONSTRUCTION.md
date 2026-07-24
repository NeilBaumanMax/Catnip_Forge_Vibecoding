# Agent 完全控制串口监视器施工文档

更新日期：2026-07-25

## 目标

让界面和 Agent 操作同一个串口监视器会话。Agent 可以查询状态、打开和关闭串口、发送、读取、等待指定输出及清空缓冲；界面会同步显示 Agent 的操作和串口数据。

本次施工不依赖真实 ESP 开发板。真实 USB-UART 设备联调留到有开发板时执行，不把“当前没有 COM 设备”判定为失败。

## 架构

```text
监视器 UI ── IPC ──┐
                    ├─ Electron 共享串口会话 ── pyserial 子进程 ── COM
Runtime MCP ─ HTTP ─┘
```

- `serial-monitor-session.ts`：唯一会话状态机、环形事件缓冲、收发统计和等待匹配。
- `serial-monitor-controller.ts`：把现有 pyserial 后端接入共享会话。
- `serial-monitor-bridge.ts`：仅监听 `127.0.0.1` 的鉴权 RPC 服务。
- `serial-monitor-client.ts`：Runtime MCP 的本机桥接客户端。
- Electron 创建 Agent MCP 配置时注入随机 URL 与令牌；令牌不进入 renderer，也不写入施工文档。
- 界面和 Agent 不再分别打开 COM 口，因此不会因自身双重占用而冲突。

## Agent 工具

| 工具 | 作用 |
| --- | --- |
| `hardboard.serial_status` | 查询会话、配置、统计与最近事件 |
| `hardboard.serial_open` | 打开共享串口 |
| `hardboard.serial_close` | 关闭共享串口 |
| `hardboard.serial_write` | 发送文本或 HEX |
| `hardboard.serial_read` | 按 `sinceSeq` 增量读取缓冲 |
| `hardboard.serial_wait` | 等待普通文本或正则匹配 |
| `hardboard.serial_clear` | 清空共享缓冲与统计 |
| `hardboard.serial_capture` | 保留兼容；应用内优先复用共享会话 |

`serial_capture` 在监视器已经打开相同端口和波特率时复用当前会话；监视器未打开时创建临时会话，采集结束后关闭。若当前会话配置与采集请求冲突，会明确报错，不抢占用户正在使用的串口。

## 界面同步

- Agent 打开串口后，监视器页同步端口、波特率、编码、数据位、停止位和校验位。
- Agent 关闭串口后，按钮与状态同步更新。
- Agent 发送的数据以 `[Agent 发送]` 标记显示。
- Agent 清空缓冲后，界面接收区同步清空。
- 页面重新加载后，从共享缓冲恢复最近事件。

## 安全和资源限制

- 桥接服务只绑定 `127.0.0.1`，每次应用启动生成 256 位随机令牌。
- RPC 请求体上限 64 KiB。
- 单次串口发送上限 8192 个字符。
- HEX 必须由完整字节组成。
- 缓冲最多保留 1000 个事件、约 1 MB 文本。
- `serial_wait` 最长等待 30 秒，正则最长 256 字符。
- 应用退出时关闭桥接服务；共享会话仍由 Electron 主进程唯一持有。

## 无硬件测试

```powershell
npm.cmd --prefix runtime run typecheck
npm.cmd --prefix electron run typecheck
npm.cmd --prefix electron run build:renderer
npm.cmd --prefix electron run verify:serial-monitor
```

`verify:serial-monitor` 使用内存模拟传输层，不枚举、不打开任何真实 COM 端口，覆盖：

- 空端口拒绝；
- Agent 打开与状态同步；
- 文本发送和无效 HEX 拒绝；
- 模拟设备回传；
- 收发事件、来源和字节统计；
- 普通文本等待命中与超时；
- 清空和关闭。

## 待真实设备验收

1. UI 打开端口，Agent 查询并读取同一会话。
2. Agent 打开端口，确认 UI 配置和状态同步。
3. Agent 发送文本/HEX，确认开发板收到且 UI 标记正确。
4. 等待 ESP 启动日志和业务响应。
5. UI 与 Agent 交替关闭、重开，确认没有残留占用。
6. 在相同端口上运行兼容 `serial_capture`，确认复用；对不同端口请求确认明确拒绝。

真实设备验收前，不宣称 USB 驱动、具体开发板或真实收发链路已通过。
