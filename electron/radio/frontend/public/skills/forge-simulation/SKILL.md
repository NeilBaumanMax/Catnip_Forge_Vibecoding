---
name: forge-simulation
description: 使用 Forge 仿真调试台的 HTTP API 调试机器人关节、动作、外观、装配、视角和屏幕画面，并读取状态与截图验证。适用于 model.zhiforge.org 或用户指定的同协议实例；保留鼠标交互，不用于烧录、真实硬件控制或网站部署。
---

# Forge 仿真调试

## 服务与能力边界

默认服务地址为 `https://model.zhiforge.org`；用户指定本地实例时使用其地址，例如 `http://127.0.0.1:5182`。不要因为默认域名存在就假定 API 已部署。

同一服务下的发现入口：

- `/api/v1/health`：服务是否可用，预期 mode 为 `simulation-only`。
- `/api/v1/capabilities`：实际支持的命令、参数范围和会话限制。
- `/openapi.json`：HTTP 请求结构。
- `/agent.md`：完整使用说明。

使用当前 Agent 环境已有的 HTTP 与浏览器工具，无需特定模型厂商、SDK 或 MCP。HTTP API 不在服务器启动浏览器；必须有一个配对页面提供 WebGL 渲染。只有 HTTP 能力而没有浏览器时，请用户打开配对链接，不要声称已有可见预览。

仅在用户要求的范围内调试。仅解释或查询状态时不要顺手改姿态、配色或屏幕。不要把此技能视作部署网站、推送 Git、执行固件、接入真实机器人或修改其他用户会话的授权。

## 建立独立会话

1. 检查 health；按需读取 capabilities 与 OpenAPI。404 或返回 HTML 通常表示只有静态站点，报告缺少 API 服务，不要反复猜路径。
2. `POST /api/v1/sessions`，使用 `Content-Type: application/json` 和正文 `{}`。返回 `id`、`token`、`browserUrl`、`expiresAt`。
3. 在浏览器打开返回的 `browserUrl`。用户授权本次仿真控制后，在页面点击“允许 Agent 连接”；若尚无授权，交由用户确认。普通鼠标页面不要直接复用成远程测试会话，优先使用独立配对页。
4. `GET /api/v1/sessions/{id}/state`，等待 `connected=true` 且 `state.loaded=true`，再提交动作。首次加载可每秒检查，超过30秒仍未就绪则检查浏览器加载提示，不无限等待。
5. 后续 Agent 请求携带 `Authorization: Bearer {token}`。使用响应中的会话信息，不硬编码历史令牌或会话 ID。

Agent token 与 browserUrl 中的浏览器凭据用途不同，不能互换。不要输出完整令牌、把配对链接公开发布、写入仓库，或发送到其他域名。普通网页链接不含配对凭据。

一个会话只能绑定一个浏览器实例。刷新配对页后应新建会话并重新配对；服务不会用新标签页抢占旧会话。用户主动断开后，不自动重连或重新申请控制。

## 提交、确认、观察

命令提交：

```http
POST /api/v1/sessions/{id}/commands
Authorization: Bearer {token}
Content-Type: application/json
Idempotency-Key: unique-command-key

{"type":"pose.set","params":{"ll":100,"rl":80,"lf":90,"rf":90}}
```

响应 `202` 和 `status=queued` 仅表示排队。记录返回的命令 `id`，读取：

```http
GET /api/v1/sessions/{id}/commands/{commandId}
Authorization: Bearer {token}
```

- `queued` / `dispatched`：尚未确认完成处理；每约0.5–1秒查询，不忙轮询。
- `applied`：浏览器已处理命令，读取 `result.state` 核对目标值。
- `failed`：读取 `error`，修正问题后再决定是否提交新命令。
- `expired`：30秒未收到确认，不能判定一定没执行；先检查当前状态，不盲目重复。

网络结果不确定时，重试相同命令必须复用同一个 `Idempotency-Key` 和完全相同的正文；不同命令使用新 key。幂等记录有保留上限，不把它当作永久去重保证。

`motion.play` 的 `applied` 表示动作已启动，不表示整个动作结束。继续读取会话 state，检查 `action`、`motionStatus` 和关节角度。播放中 `motion.pause` 或鼠标调关节会转为 `manual`；结束通常回到 `home`。不要仅凭耗时猜测动作完成。

状态是浏览器最近上报的快照，检查 `connected` 和 `observedAt`；断开后的旧状态不能当作实时结果。后台标签页可能被节流，应保持配对页活跃。

## 调试命令

以下为 v1 接口；调用前以 capabilities 返回的范围为准。支持部分字段的命令仅发送要修改的字段。

| type | params | 作用 |
|---|---|---|
| `pose.set` | `{"ll":90,"rl":90,"lf":110,"rf":70}` | 左腿、右腿、左脚、右脚，0–180°；修改后进入手动姿态 |
| `model.set` | `{"model":"a"}` 或 `{"model":"b"}` | a=刘看山机器人，b=奶蛙机器人 |
| `colors.set` | `{"shell":"#ffffff","body":"#ffffff","limbs":"#e6e9e5"}` | 外壳、机身、腿脚，六位 HEX |
| `mount.set` | `{"shellHeight":51,"shellDepth":0,"shellYaw":0,"bodyDepth":0,"explode":0}` | 装配位置和爆炸展开 |
| `assembly.view` | `{"inspect":"assembly","shell":true,"body":true,"screen":true,"grip":true,"axes":false,"transparent":false}` | 部件、屏幕、轴线和透视显示 |
| `view.set` | `{"view":"front","rotate":false,"wireframe":false}` | front/side/back/fit、自动旋转、线框 |
| `motion.play` | `{"name":"walk","period":1000,"steps":3,"height":30,"direction":1,"speed":1}` | 播放固件逻辑动作 |
| `motion.pause` | `{}` | 停止推进动作并保持角度 |
| `motion.home` | `{}` | 停止动作、四关节回90°，不会自动关闭所有其他动画 |
| `screen.gif` | `{"face":"happy"}` | 内置 GIF 表情 |
| `screen.js` | `{"code":"ctx.fillStyle='#00ff88';ctx.fillRect(0,0,width,height);"}` | 更新隔离的 Canvas 屏幕程序 |
| `screen.stop` | `{}` | 停止 JS 屏幕动画，保留最后一帧；不停止 GIF |
| `snapshot` | `{}` | 获取3D视口 PNG 与状态 |

动作名：`walk`、`turn`、`jump`、`swing`、`moonwalk`、`bend`、`shake`、`updown`、`tiptoe`、`jitter`、`ascending`、`crusaito`、`flapping`。

动作参数：period=500–1500ms、10ms步进；steps=1–100整数；height=0–170整数；direction 为1或-1；speed=0.3–2、0.1步进。缺省动作参数是1000ms、3次、30°、方向1、速度1。

装配参数：shellHeight=20–100；shellDepth=-60–60；shellYaw=-180–180°；bodyDepth=-20–20；explode=0–1。inspect 可为 assembly/shell/body/leg/foot/grip。

内置表情：neutral/happy/laughing/confused/sleepy/angry。API 不接受任意远程 GIF URL；自有 GIF 仍走网页本地文件导入。

这是四舵机逻辑角度预览，不是碰撞、重心稳定性、电流或真实舵机反馈验证。源码 Jump 忽略 steps 参数；不能由这个现象直接推断 API 失效。

## 编写屏幕程序

代码每帧执行一次，已有参数：`ctx`（Canvas 2D）、`width`/`height`（240）、`time`（秒）、`delta`（秒）、`state`（跨帧对象）。直接绘制，不另起动画循环。

```javascript
ctx.fillStyle = '#07152b';
ctx.fillRect(0, 0, width, height);
ctx.save();
ctx.translate(width / 2, height / 2);
ctx.rotate(time * Math.PI / 18); // 每秒10度
ctx.strokeStyle = '#7df9ff';
ctx.lineWidth = 5;
ctx.strokeRect(-55, -55, 110, 110);
ctx.restore();
```

示例是旋转的二维正方形，不是三维立方体。代码在隔离 iframe 的 Worker 内执行，不支持 DOM、网络、导入 Three.js 或页面全局变量；不要提交死循环。超过2秒无响应会被终止。

`screen.js` 成功确认仅表示初始化成功；后续逐帧异常应检查 `state.screen.status`。不要仅凭成功HTTP状态断言屏幕画面正确。API 状态不返回原有完整代码，不要据此推断或“恢复”未知的用户代码。

## 图像验证与鼠标共存

外观、装配、视角或屏幕变更后，发送 `snapshot`。解码 `result.image` 的 `data:image/png;base64,...` 并使用当前环境的图像查看能力检查；这是最大边1024像素的3D视口，不含外部电脑插画、主机按钮或整页布局。整页检查应使用浏览器截图。

同时核对结果状态与画面，尤其是模型是否加载、关节左右是否正确、屏幕是否被外壳遮挡。服务只保留最近一次截图图像；需要留存时及时保存，旧结果可能包含 `imageEvicted=true`。

鼠标始终可操作。不要隐藏控件、锁定滑条、覆盖已有事件处理器或用API轮询强制纠正用户刚拖动的值。用户正在同一会话手动调整时，暂停自动写入并重新读取状态。Agent 的屏幕更新不强制打开编辑弹窗，用户仍可从“屏幕 → 打开代码编辑器”编辑。

## 错误处理与收尾

- 400：根据 capabilities 修正参数，不裁剪越界值后假装原请求成功。
- 401：检查本会话令牌；失效则报告，不借用其他会话。
- 404：区分服务路由缺失、会话过期、命令结果被淘汰。
- 409：检查是否未配对、断开、重复绑定或幂等 key 冲突。
- 429/503：退避并报告限流/容量，不并发创建大量会话。

默认一小时会话；Workers 版使用 Durable Objects 持久化，Node 版单进程内存保存、重启失效。最多30会话、每会话20条待处理命令、保留最近30条结果。检查服务实际返回的 expiresAt 和 capabilities，不因为服务持久化就假定会话永不过期或浏览器一直在线。

结束后报告实际修改、状态验证和图像验证结果。自己创建的临时会话在用户不需要继续控制时用 `DELETE /api/v1/sessions/{id}` 关闭；用户要求保留会话时说明到期时间，但不要公开令牌。删除会话不会撤销已应用的画面，也不会自动停止已经开始的动作；是否先归位或停屏幕应按用户意图决定，不无条件重置用户成果。
