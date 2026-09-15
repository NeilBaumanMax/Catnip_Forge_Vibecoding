import asyncio
import importlib
import json
import os
import sys
import types
from pathlib import Path

import httpx
import pytest
from fastapi.testclient import TestClient
from .store import Store
from .zhihu import Zhihu, ToolError, prepare, safe_numbers, tool_definitions


@pytest.fixture
def vault(tmp_path, monkeypatch):
    monkeypatch.delenv('ZHIHU_ACCESS_SECRET', raising=False)
    return Store(tmp_path)


def test_encrypted_store(vault):
    vault.put('access_secret', 'fake-unit-test-secret')
    assert vault.secret() == 'fake-unit-test-secret'
    assert b'fake-unit-test-secret' not in vault.db.read_bytes()
    if os.name != 'nt':
        assert vault.db.stat().st_mode & 0o777 == 0o600


@pytest.mark.parametrize('tool,args', [('publish', {}), ('answers', {'url': 'http://127.0.0.1/private'}), ('comments', {'url': 'https://www.zhihu.com/question/123'}), ('search_zhihu', {'query': ''}), ('hot', {'limit': 500}), ('contents', {'offset': '1.5'}), ('contents', {'oauth_token': 'no'}), ('favlist_items', {'folder_id': ''})])
def test_validation(tool, args):
    with pytest.raises(ToolError):
        prepare(tool, args)


def test_protocol_and_single_page(vault):
    vault.put('access_secret', 'unit-test-value')
    requests = []
    def handler(req):
        requests.append(req)
        assert req.headers['Authorization'] == 'Bearer unit-test-value'
        assert req.headers['X-Request-Timestamp'].isdigit()
        assert 'X-OAuth-Token' not in req.headers
        assert req.url.params['ContentType'] == 'all'
        return httpx.Response(200, json={'Code': 0, 'Data': {'Items': [], 'Paging': {'IsEnd': False, 'NextOffset': '9223372036854775806'}}})
    data = asyncio.run(Zhihu(vault, httpx.MockTransport(handler)).call('contents', {}))
    assert len(requests) == 1
    assert data['data']['Paging']['NextOffset'] == '9223372036854775806'
    assert data['summary_only']


def test_direct_answer_body(vault):
    vault.put('access_secret', 'fake')
    def handler(req):
        assert req.method == 'POST'
        assert set(json.loads(req.content)) == {'model', 'messages', 'stream'}
        return httpx.Response(200, json={'choices': [{'message': {'content': 'mock answer'}}]})
    assert asyncio.run(Zhihu(vault, httpx.MockTransport(handler)).call('answer', {'query': 'test'}))['data']['Text'] == 'mock answer'


def test_no_retry_or_secret_in_error(vault):
    vault.put('access_secret', 'never-expose-me')
    count = 0
    def handler(req):
        nonlocal count
        count += 1
        return httpx.Response(200, json={'Code': 30001, 'Message': 'never-expose-me'})
    with pytest.raises(ToolError) as exc:
        asyncio.run(Zhihu(vault, httpx.MockTransport(handler)).call('hot', {}))
    assert 'never-expose-me' not in str(exc.value)
    assert count == 1


def test_no_credentials_no_network(vault):
    with pytest.raises(ToolError) as exc:
        asyncio.run(Zhihu(vault).call('hot', {}))
    assert exc.value.code == 'AUTH_REQUIRED'


def test_large_ids():
    assert safe_numbers({'id': 9223372036854775806}) == {'id': '9223372036854775806'}


def test_null_url():
    with pytest.raises(ToolError):
        prepare('detail', {'url': None})


def test_native_plugin_uses_same_tools(monkeypatch):
    # Contract check with a stub registry: no real model / TTS used by this unit test.
    registry = {}
    stub = types.ModuleType('plugins_func.register')
    stub.register_function = lambda name, desc, kind: lambda fn: registry.setdefault(name, (desc, fn))
    stub.ToolType = types.SimpleNamespace(SYSTEM_CTL=4)
    stub.Action = types.SimpleNamespace(REQLLM=3)
    stub.ActionResponse = object
    monkeypatch.setitem(sys.modules, 'plugins_func', types.ModuleType('plugins_func'))
    monkeypatch.setitem(sys.modules, 'plugins_func.register', stub)
    path = Path(__file__).resolve().parents[1] / 'vendor/main/xiaozhi-server/plugins_func/functions/forge_zhihu.py'
    spec = importlib.util.spec_from_file_location('forge_plugin_test', path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    definitions = tool_definitions()
    assert set(registry) == {d['name'] for d in definitions}
    for d in definitions:
        assert registry[d['name']][0]['function']['parameters']['required'] == d['inputSchema']['required']
    assert mod._ROOT == Path(__file__).resolve().parents[1]


def test_http_offline_robot_query_and_security(vault, monkeypatch):
    monkeypatch.setenv('FORGE_DATA_DIR', str(vault.db.parent))
    from . import app as module
    monkeypatch.setattr(module, 'store', vault)
    vault.put('access_secret', 'fake-key')
    transport = httpx.MockTransport(lambda req: httpx.Response(200, json={'Code': 0, 'Data': {'Items': [{'Title': 'TEST FIXTURE', 'Summary': '<script>do not execute</script>'}]}}))
    monkeypatch.setattr(module, 'zhihu', Zhihu(vault, transport))
    client = TestClient(module.app)
    assert client.get('/api/settings').status_code == 401
    assert client.post('/api/session').status_code == 403
    headers = {'Origin': 'http://testserver', 'X-Forge-Client': 'web'}
    assert client.post('/api/session', headers=headers).status_code == 200
    assert client.get('/api/status').json()['xiaozhi_connections'] == 0
    result = client.post('/api/query', headers=headers, json={'tool': 'contents', 'args': {}})
    assert result.status_code == 200
    assert result.json()['data']['Items'][0]['Title'] == 'TEST FIXTURE'
    assert 'fake-key' not in client.get('/api/settings').text
    assert client.post('/api/query', headers={**headers, 'Origin': 'https://evil.example'}, json={'tool': 'hot'}).status_code == 403
    assert client.get('/api/status', headers={'host': 'evil.example'}).status_code == 400
    assert client.put('/api/persona', headers=headers, json={'name': '测试', 'interests': '机器人'}).status_code == 200
    assert client.get('/api/persona').json()['interests'] == '机器人'
    assert client.get('/api/events').json()['events'][-1]['kind'] == 'result'
