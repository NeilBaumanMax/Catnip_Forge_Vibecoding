# Forge 电台

> 桌面“小智”副本包含完整源码、模型资源及已构建前端，不包含密钥、运行数据库和依赖环境。首次运行先执行 `python3.11 -m venv .venv`，再执行 `.venv/bin/python -m pip install -r backend/requirements.txt`，然后执行 `.venv/bin/python run.py web`。知乎凭据需要在设置中重新填写。原项目预览若仍占用 8890 端口，请先停止原服务；以下“本机依赖已准备好”指原项目，不是此副本。

现有 3D 前端 + Python 知乎只读 API + 原生小智 server 工具插件。项目独立于原来的 `zhiforge_model`，没有改动原仓库，也没有推送。

## 本地启动

在项目根目录运行（本机依赖和前端构建已经准备好）：

```sh
.venv/bin/python run.py web
```

打开 http://127.0.0.1:8890/ 。光驱切换 AI 社区与硬件测试台；鼠标旋转、缩放、关节滑条仍保留。

重新安装或换电脑：Python 3.11 创建 `.venv`，安装 `backend/requirements.txt`；进入 `frontend` 执行 `npm ci`、`npm run build`。每次前端修改后重新 build；后端修改后重启 web。

## 知乎

在主机「设置」保存自己的 Access Secret。浏览器不持久保存密钥，后端只返回“已配置”。现有测试凭据已加密保存在本机 `.runtime/`，不要上传这个目录。

支持搜索知乎、搜索全网、热榜、知乎直答、问题发现、回答摘要、本人帖子列表/全文/评论/数据、关注、最近收藏与收藏夹。结果显示在左侧电脑中，保留来源；列表摘要与全文分别读取，评论仅查本人内容，分页由用户主动点击。没有发帖接口，没有安装知乎 CLI。

「人设」保存角色说明、兴趣和手动长期记忆；查询可以使用这些兴趣。小智每轮读取同一份人设。当前不是自动记忆提取服务，声纹管理也未实现。

## 小智思考、工具调用与语音

先安装可选无硬件依赖：

```sh
.venv/bin/python -m pip install -r backend/xiaozhi-headless-requirements.txt
```

macOS 还需要系统 libopus 和 ffmpeg。本机已存在。然后在另一个终端配置支持工具调用的 OpenAI-compatible 模型环境变量：

```sh
export XIAOZHI_LLM_MODEL='你的模型名称'
export XIAOZHI_LLM_BASE_URL='你的模型服务 /v1 地址'
# 安全地在本机环境中设置 XIAOZHI_LLM_API_KEY，不要提交密钥。
.venv/bin/python run.py xiaozhi
```

小智默认监听 `ws://127.0.0.1:8000/xiaozhi/v1/`。点击页面右上角「连接小智」。初始化成功后，可以文字对话，让小智查询知乎；同一工具结果会同步显示到电脑屏幕。查询后的自动讲解也交给小智生成，Edge TTS 音频通过浏览器播放，需要网络。

调用链：WebUI → Python WebSocket 转发 → 原生 `ConnectionHandler.chat` → `forge_zhihu` 工具 → Python 知乎 API → 小智回复/TTS。Python 网关没有另建推理引擎。知乎直答只是一个可选查询工具，不是主模型。

默认无硬件模式跳过 VAD/ASR，模型、工具调用和 TTS 保留。尚未完成真实模型/TTS端到端验证，因为缺少模型配置。物理机器人需要另行配置完整音频依赖、网络接入和鉴权；当前网页点击查询不会直接向任意硬件设备推送音频。语音设备复用工具的插件已加入，但硬件联调未验证。

## 本地 API 与安全边界

页面右上角「查询 API」打开 `/api/docs`，`/api/tools` 返回工具定义。脚本使用本机 `.runtime/service.token` 作为 Bearer token（不是知乎密钥），调用 `POST /api/query`，请求形如 `{"tool":"hot","args":{"limit":1}}`。不要把 token 发给不可信网站或写入浏览器持久存储。

仅限本机单用户使用，绑定 loopback，并校验 Host、Origin、浏览器会话。不能直接作为公网多用户服务部署；公网部署需增加用户认证、每用户凭据隔离、HTTPS、配额与审计。旧前端自带的 `/api/v1/sessions` 3D Agent broker 未迁移到新 Python 服务，不能当作当前可用接口。

## 验证

```sh
.venv/bin/python -m pytest backend/test_radio.py -q
.venv/bin/python -m backend.check_native_imports
```

`backend/live_check.py` 会消耗真实 API 配额，只在明确需要时运行。

2026-09-15 真实接口验证：搜索知乎 1 条、热榜 1 条成功，本人帖子列表成功返回 0 条，因此没有猜测 URL 调用全文或评论。页面热榜按钮另一次成功显示 5 条结果及来源。原生小智依赖导入成功，但这不是模型和语音联调通过的证明。

上游小智来源：`xiaozhi-esp32-server`，归档提交 `6afc54a17def47578a4b3efc4680873689d3168b`。许可证见 `vendor/LICENSE`；前端资源声明见 `frontend/THIRD_PARTY_NOTICES.md`。知乎接口依据用户提供的 Skill，保存在 `docs/zhihu/`。
