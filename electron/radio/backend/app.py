"""Single-owner loopback WebUI + Zhihu tools + Xiaozhi transport (no second LLM)."""
import asyncio
import json
import os
import secrets
import time
from collections import deque
from pathlib import Path
from urllib.parse import urlsplit

import websockets
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.trustedhost import TrustedHostMiddleware
from .store import Store
from .zhihu import Zhihu, ToolError, tool_definitions

ROOT = Path(__file__).resolve().parents[1]
store = Store(Path(os.getenv('FORGE_DATA_DIR', ROOT / '.runtime')))
zhihu = Zhihu(store)
app = FastAPI(title='Forge 电台 · Python', docs_url='/api/docs', openapi_url='/api/openapi.json')
app.add_middleware(TrustedHostMiddleware, allowed_hosts=['127.0.0.1', 'localhost', 'testserver'])
events = deque(maxlen=20)
revision = 0
sessions = {}
bridges = set()
query_limit = asyncio.Semaphore(2)
HTTP_PORT = int(os.getenv('FORGE_HTTP_PORT', '8890'))
XIAOZHI_PORT = int(os.getenv('FORGE_XIAOZHI_PORT', '8000'))
ORIGINS = {f'http://127.0.0.1:{HTTP_PORT}', f'http://localhost:{HTTP_PORT}', 'http://testserver'}


def emit(kind, **data):
    global revision
    revision += 1
    events.append({'id': revision, 'kind': kind, 'time': time.time(), **data})


def authenticated(request):
    header = request.headers.get('authorization', '')
    if header.startswith('Bearer ') and secrets.compare_digest(header[7:], store.token):
        return True
    return sessions.get(request.cookies.get('forge_session', ''), 0) > time.time()


@app.middleware('http')
async def security(request: Request, call_next):
    path = request.url.path
    if path.startswith('/api/'):
        origin = request.headers.get('origin')
        if origin and origin not in ORIGINS:
            return JSONResponse({'message': '不允许跨站请求'}, status_code=403)
        if path != '/api/session' and not authenticated(request):
            return JSONResponse({'message': '请打开本机页面重新建立会话'}, status_code=401)
        if request.method in {'POST', 'PUT', 'DELETE'} and not request.headers.get('authorization'):
            if request.headers.get('x-forge-client') != 'web' or origin not in ORIGINS:
                return JSONResponse({'message': '请求来源验证失败'}, status_code=403)
        try:
            size = int(request.headers.get('content-length', '0'))
        except ValueError:
            size = 100001
        if size > 100000:
            return JSONResponse({'message': '请求过大'}, status_code=413)
    response = await call_next(request)
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['Referrer-Policy'] = 'no-referrer'
    if path.startswith('/api/'):
        response.headers['Cache-Control'] = 'no-store'
    return response


@app.exception_handler(ToolError)
async def tool_error(request, error):
    return JSONResponse({'message': str(error), 'code': error.code}, status_code=400 if error.code in {'INVALID_INPUT', 'UNKNOWN_TOOL'} else 502)


@app.exception_handler(json.JSONDecodeError)
async def invalid_json(request, error):
    return JSONResponse({'message': '请求必须是有效 JSON', 'code': 'INVALID_INPUT'}, status_code=400)


@app.post('/api/session')
async def session():
    now = time.time()
    for key, expires in list(sessions.items()):
        if expires < now:
            sessions.pop(key, None)
    if len(sessions) >= 32:
        return JSONResponse({'message': '本机会话数量已满'}, status_code=429)
    token = secrets.token_urlsafe(32)
    sessions[token] = now + 8*3600
    response = JSONResponse({'ok': True})
    response.set_cookie('forge_session', token, httponly=True, samesite='strict', max_age=8*3600)
    return response


@app.get('/api/status')
async def status():
    return {'backend': 'ready', 'zhihu_configured': bool(store.secret()), 'xiaozhi_connections': len(bridges), 'hardware_required': False, 'publish_supported': False, 'revision': revision}


@app.get('/api/tools')
async def tools():
    return {'tools': tool_definitions()}


@app.get('/api/persona')
async def persona():
    return store.persona()


@app.put('/api/persona')
async def save_persona(request: Request):
    body = await request.json()
    allowed = {'name', 'persona', 'memory', 'interests', 'language', 'voice', 'model', 'speechRate', 'speechPitch'}
    if not isinstance(body, dict) or set(body) - allowed or any(not isinstance(v, str) or len(v) > 16000 for v in body.values()):
        raise ToolError('人设字段无效', 'INVALID_INPUT')
    store.put('persona', body)
    return {'ok': True, 'message': '已保存。小智下一轮对话读取同一份人设与兴趣。'}


@app.get('/api/settings')
async def settings():
    return {'access_secret_configured': bool(store.secret()), 'xiaozhi_url': store.get('xiaozhi_url', f'ws://127.0.0.1:{XIAOZHI_PORT}/xiaozhi/v1/'), 'xiaozhi_token_configured': bool(store.get('xiaozhi_token', ''))}


def validate_xiaozhi_url(value):
    u = urlsplit(value)
    if u.scheme not in {'ws', 'wss'} or u.hostname not in {'127.0.0.1', 'localhost'} or u.username or u.password or u.query or u.fragment:
        raise ToolError('本地版请填写 ws://127.0.0.1:端口/xiaozhi/v1/，凭证单独填写', 'INVALID_INPUT')
    if u.path != '/xiaozhi/v1/':
        raise ToolError('小智路径应为 /xiaozhi/v1/', 'INVALID_INPUT')
    return value


@app.put('/api/settings')
async def save_settings(request: Request):
    body = await request.json()
    if not isinstance(body, dict) or set(body) - {'access_secret', 'xiaozhi_url', 'xiaozhi_token'} or any(not isinstance(v, str) or len(v) > 8000 for v in body.values()):
        raise ToolError('设置字段无效', 'INVALID_INPUT')
    if body.get('xiaozhi_url'):
        validate_xiaozhi_url(body['xiaozhi_url'])
    for key, value in body.items():
        if value.strip():
            store.put(key, value.strip())
    return {'ok': True, 'message': '已加密保存到本机 Python 后端；未发起额外知乎调用'}


@app.get('/api/events')
async def get_events(after: int = 0):
    return {'events': [e for e in events if e['id'] > after and e['time'] > time.time()-600], 'revision': revision}


@app.post('/api/query')
async def query(request: Request):
    body = await request.json()
    if not isinstance(body, dict) or set(body) - {'tool', 'args'} or not isinstance(body.get('tool'), str):
        raise ToolError('查询格式无效', 'INVALID_INPUT')
    async with query_limit:
        result = await zhihu.call(body['tool'], body.get('args', {}))
    emit('result', result=result)
    return result


@app.websocket('/api/xiaozhi')
async def xiaozhi_bridge(web: WebSocket):
    if web.headers.get('origin') not in ORIGINS or not authenticated(web):
        await web.close(code=1008)
        return
    await web.accept()
    upstream = None
    pending = set()
    try:
        upstream = await websockets.connect(validate_xiaozhi_url(store.get('xiaozhi_url', f'ws://127.0.0.1:{XIAOZHI_PORT}/xiaozhi/v1/')), additional_headers={'Device-Id': 'forge-web-' + secrets.token_hex(6), 'Client-Id': 'forge-radio', 'Authorization': 'Bearer ' + store.get('xiaozhi_token', '')}, open_timeout=8, max_size=2000000)
        await upstream.send(json.dumps({'type': 'hello', 'version': 1, 'transport': 'websocket', 'features': {}, 'audio_params': {'format': 'pcm', 'sample_rate': 24000, 'channels': 1, 'frame_duration': 60}}))
        bridges.add(web)

        async def receive_server():
            async for packet in upstream:
                if isinstance(packet, bytes):
                    await web.send_bytes(packet)
                else:
                    try:
                        message = json.loads(packet)
                    except ValueError:
                        await web.send_json({'type': 'error', 'message': '小智未接受此虚拟终端，请检查服务配置'})
                        continue
                    if message.get('type') in {'hello', 'tts', 'stt', 'llm', 'forge_ready', 'forge_error'}:
                        await web.send_json(message)

        async def receive_browser():
            async for text in web.iter_text():
                if len(text) > 16000:
                    continue
                try:
                    message = json.loads(text)
                except ValueError:
                    continue
                if message.get('type') == 'abort':
                    await upstream.send(json.dumps({'type': 'abort', 'reason': 'user'}))
                elif message.get('type') == 'text' and isinstance(message.get('text'), str) and 0 < len(message['text']) <= 12000:
                    await upstream.send(json.dumps({'type': 'listen', 'state': 'detect', 'mode': 'manual', 'text': message['text']}, ensure_ascii=False))

        pending = {asyncio.create_task(receive_server()), asyncio.create_task(receive_browser())}
        done, _ = await asyncio.wait(pending, return_when=asyncio.FIRST_COMPLETED)
        for task in done:
            task.result()
    except (OSError, TimeoutError, websockets.exceptions.WebSocketException, ToolError):
        try:
            await web.send_json({'type': 'error', 'message': '小智连接失败，请先启动本地小智 server。知乎查询不受影响。'})
        except RuntimeError:
            pass
    except (WebSocketDisconnect, RuntimeError):
        pass
    finally:
        bridges.discard(web)
        for task in pending:
            task.cancel()
        if pending:
            await asyncio.gather(*pending, return_exceptions=True)
        if upstream:
            await upstream.close()
        try:
            await web.close()
        except RuntimeError:
            pass


dist = ROOT / 'frontend/dist'
if dist.exists():
    app.mount('/', StaticFiles(directory=dist, html=True), name='frontend')
