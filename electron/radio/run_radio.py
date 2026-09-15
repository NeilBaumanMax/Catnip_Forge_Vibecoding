"""Electron-owned Forge Radio process: HTTP UI/API and optional Xiaozhi server."""
import asyncio
import os
from pathlib import Path
import sys

import uvicorn

ROOT = Path(__file__).resolve().parent
os.chdir(ROOT)
sys.path.insert(0, str(ROOT))


async def run_xiaozhi():
    if not os.getenv("XIAOZHI_LLM_MODEL") or not os.getenv("XIAOZHI_LLM_BASE_URL"):
        return
    os.environ["FORGE_RADIO"] = "1"
    os.environ.setdefault("FORGE_TEXT_ONLY", "1")
    from backend.app import store
    os.environ["FORGE_SERVICE_TOKEN"] = store.token
    server_root = ROOT / "vendor/main/xiaozhi-server"
    os.chdir(server_root)
    sys.path.insert(0, str(server_root))
    from config.config_loader import load_config
    from core.websocket_server import WebSocketServer
    config = await load_config()
    await WebSocketServer(config).start()


async def main():
    http_port = int(os.getenv("FORGE_HTTP_PORT", "8890"))
    config = uvicorn.Config(
        "backend.app:app",
        host="127.0.0.1",
        port=http_port,
        access_log=False,
        log_level="warning",
    )
    http_server = uvicorn.Server(config)
    http_task = asyncio.create_task(http_server.serve())
    while not http_server.started and not http_task.done():
        await asyncio.sleep(0.05)
    if http_task.done():
        await http_task
        return
    xiaozhi_enabled = bool(os.getenv("XIAOZHI_LLM_MODEL") and os.getenv("XIAOZHI_LLM_BASE_URL"))
    print(f"FORGE_RADIO_READY:{http_port}:{1 if xiaozhi_enabled else 0}", flush=True)
    tasks = [http_task]
    if xiaozhi_enabled:
        tasks.append(asyncio.create_task(run_xiaozhi()))
    done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
    for task in pending:
        task.cancel()
    for task in done:
        task.result()


if __name__ == "__main__":
    asyncio.run(main())
