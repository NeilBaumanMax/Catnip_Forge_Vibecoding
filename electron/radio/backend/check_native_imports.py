"""Offline smoke check: loads upstream native components, never calls a model."""
import os
import sys
from pathlib import Path
from .store import Store

root = Path(__file__).resolve().parents[1]
os.environ.update(FORGE_RADIO='1', FORGE_TEXT_ONLY='1', FORGE_SERVICE_TOKEN=Store(root / '.runtime').token, XIAOZHI_LLM_MODEL='import-test-only', XIAOZHI_LLM_BASE_URL='http://127.0.0.1:65534/v1')
server = root / 'vendor/main/xiaozhi-server'
os.chdir(server)
sys.path.insert(0, str(server))
from core.websocket_server import WebSocketServer
print('Native Xiaozhi imports OK; no model request made')
