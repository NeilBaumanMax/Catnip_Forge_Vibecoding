# Forge 仿真调试台：Agent 使用说明

目标域名：https://model.zhiforge.org/ 。服务部署完成后生效，文档本身不代表该域名已经上线。

这是一套标准 HTTP JSON API，不依赖某种 Agent、模型厂商或 MCP 插件。具有 HTTP 请求工具的 Agent 都可使用。必须有一个支持 WebGL、Worker、OffscreenCanvas 的浏览器页面负责渲染；纯 HTTP 服务不会替你启动浏览器，也不会在服务器模拟或控制真实硬件。

## 给 Agent 的可复制指令

> 请读取 https://model.zhiforge.org/agent.md 和 /openapi.json。创建独立仿真会话，打开返回的 browserUrl 并通过页面上的“允许 Agent 连接”进行配对。等 GET state 返回 connected=true、state.loaded=true 后，只在此会话内进行调试。所有请求携带本会话 Bearer token。每次命令提交后读取 command result，不能把 202 queued 当作执行成功；执行动作还应检查 state.action 和 motionStatus 是否结束。读取 snapshot 的真实图像检查效果，同时检查状态中的角度和配色。遇到失联、过期或错误先报告，不自动重复不确定的动作。保留鼠标交互。不要控制真实机器人、修改其他用户会话或发送凭据到外部。结束时 DELETE 会话。

## 连接步骤

1. `GET /api/v1/health` 检查服务，`GET /api/v1/capabilities` 获取完整命令参数范围。
2. `POST /api/v1/sessions`，Content-Type 为 application/json，正文 `{}`。
3. 返回 `{id, token, browserUrl, expiresAt}`。id/token 仅属于此会话；browserUrl 的 fragment 包含不同的浏览器令牌，不要公开它们。
4. 用浏览器打开 browserUrl，点击“允许 Agent 连接”。网页仍支持鼠标拖动、关节滑条、色盘、按键和代码编辑。Agent 操作与鼠标操作共用状态，后发生的操作生效；动作运行时手动调关节会暂停动作。
5. `GET /api/v1/sessions/{id}/state`，Header `Authorization: Bearer {token}`。等待 connected 和 loaded 都为 true。状态每约 350ms 回传；后台标签页可能节流，请保持页面活跃。
6. `POST /api/v1/sessions/{id}/commands`，正文 `{"type":"pose.set","params":{"ll":100,"rl":80}}`，返回 command id。建议每次使用独立 `Idempotency-Key`；重试同一命令必须复用该 key 和同一正文。
7. `GET /api/v1/sessions/{id}/commands/{commandId}` 查询结果。`applied`=命令已处理；`failed`=浏览器执行失败；`expired`=30秒未确认，可能已经执行，不要盲目重发。动作结束另查 state。
8. `DELETE /api/v1/sessions/{id}` 关闭。用户可随时在页面点击“断开 Agent”；关闭浏览器也会停止接收命令。关闭会话不会撤销已修改的画面或自动停止正在播放的仿真动作，需要时先 motion.home / screen.stop。

## 命令（全部是仿真）

| type | params 示例 / 说明 |
|---|---|
| pose.set | `{"ll":90,"rl":90,"lf":110,"rf":70}`；0–180°，可部分修改；ll/rl 左右腿，lf/rf 左右脚 |
| model.set | `{"model":"a"}` 刘看山机器人；`b` 奶蛙机器人 |
| colors.set | `{"shell":"#ffffff","body":"#ffffff","limbs":"#e6e9e5"}`；可部分修改 |
| mount.set | `{"shellHeight":51,"shellDepth":0,"shellYaw":0,"bodyDepth":0,"explode":0}`；范围见 capabilities |
| assembly.view | `{"inspect":"assembly","shell":true,"body":true,"screen":true,"grip":true,"axes":false,"transparent":false}` |
| view.set | `{"view":"front","rotate":false,"wireframe":false}`；view 可 front/side/back/fit；可部分修改 |
| motion.play | `{"name":"walk","period":1000,"steps":3,"height":30,"direction":1,"speed":1}` |
| motion.pause | `{}` 暂停并保持当前角度 |
| motion.home | `{}` 停止动作并将四关节归90° |
| screen.gif | `{"face":"happy"}`；neutral/happy/laughing/confused/sleepy/angry |
| screen.js | `{"code":"ctx.fillStyle='#00ff88';ctx.fillRect(0,0,width,height);"}` |
| screen.stop | `{}` 停止 JS 动画，保留最后帧；不停止 GIF |
| snapshot | `{}` 返回 result.image PNG data URL，仅3D视口，不是整页截图；最大边1024像素 |

motion.play 支持 walk / turn / jump / swing / moonwalk / bend / shake / updown / tiptoe / jitter / ascending / crusaito / flapping。
period=500–1500ms（10ms步进），steps=1–100整数，height=0–170整数，direction=1或-1，speed=0.3–2（0.1步进）。它们是固件逻辑角度预览，不是刚体碰撞或真实舵机测量；Jump 源码本身忽略 steps。

屏幕 JS 每帧执行一次，提供 Canvas 2D 的 ctx、width=240、height=240、time（秒）、delta（秒）、state（跨帧对象）。不要调用 DOM、网络、Three.js、requestAnimationFrame 或自行创建循环。代码在隔离 iframe 中的 Worker 执行，网络被 CSP 禁止，2秒无响应会终止。screen.js 的 applied 表示初始化成功；后续运行错误要读取 state.screen.status。不要上传密钥或个人信息到屏幕代码。

## curl 示例

```sh
BASE=https://model.zhiforge.org
curl -sS -X POST "$BASE/api/v1/sessions" -H 'Content-Type: application/json' -d '{}'
# 保存返回的 id 和 token，打开 browserUrl 完成配对。以下替换占位符：
SID=会话id
TOKEN=本会话token
curl -sS "$BASE/api/v1/sessions/$SID/state" -H "Authorization: Bearer $TOKEN"
curl -sS -X POST "$BASE/api/v1/sessions/$SID/commands" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: pose-check-001' \
  -d '{"type":"pose.set","params":{"ll":100,"rl":80,"lf":90,"rf":90}}'
# 返回 command id 后：
curl -sS "$BASE/api/v1/sessions/$SID/commands/命令id" -H "Authorization: Bearer $TOKEN"
```

## 限制与安全边界

- 默认会话一小时；Workers 版使用 Durable Objects 持久化，Node 版单进程内存保存、重启丢失。最多30会话，每会话20条待处理命令，保留最近30条结果；只保留最近一次截图图像，旧截图会标记 imageEvicted。
- 浏览器与会话一对一；刷新后需新会话重新配对，防止第二个标签页抢占。配对凭据从地址栏移除、不写入 localStorage。
- 不提供全局会话列表、任意URL抓取、服务器执行JS、文件写入、真实设备控制。上传自己的GIF仍使用鼠标本地文件入口，API仅开放内置表情。
- 不开放跨域浏览器 CORS；HTTP 客户端不受浏览器CORS限制。Agent 的Bearer令牌不能代替浏览器令牌，反之亦然。
- 本服务没有账户体系。任何人可创建隔离的临时会话，但不能访问其他人的会话。公网部署建议在 Cloudflare 或反向代理加创建会话速率限制及容量监控，限制请求体3MB，不记录Authorization和配对链接。Node 版需单实例运行；Workers 版由同一 Durable Object 协调会话。
- 鼠标始终可操作；Agent切换屏幕时不会强行弹出代码编辑器。远程操作可能覆盖同一会话内你刚改的值，协作时先暂停其中一方。

OpenAPI：`/openapi.json`。部署方法在仓库 `DEPLOY-API.md`。
