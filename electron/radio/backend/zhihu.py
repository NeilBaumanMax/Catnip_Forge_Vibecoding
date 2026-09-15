"""Official read-only contracts from docs/zhihu. No cookies, scraping or publish endpoint."""
import re
import time
from urllib.parse import urlsplit, urlunsplit

import httpx


class ToolError(Exception):
    def __init__(self, message, code='UPSTREAM_ERROR'):
        super().__init__(message)
        self.code = code


# name: (display label, official path, allowed input -> upstream parameter)
SPECS = {
    'search_zhihu': ('搜索知乎', '/api/v1/content/zhihu_search', {'query': 'Query', 'limit': 'Count'}),
    'search_global': ('搜索全网', '/api/v1/content/global_search', {'query': 'Query', 'limit': 'Count'}),
    'hot': ('知乎热榜', '/api/v1/content/hot_list', {'limit': 'Limit'}),
    'recommend': ('问题发现', '/api/v1/user/question_recommendations', {'query': 'Query', 'limit': 'Count'}),
    'answers': ('问题回答摘要', '/api/v1/content/question_answers', {'url': 'QuestionUrl', 'limit': 'Limit', 'offset': 'Offset'}),
    'contents': ('我的帖子', '/api/v1/user/contents', {'content_type': 'ContentType', 'limit': 'Limit', 'offset': 'Offset'}),
    'detail': ('本人创作全文', '/api/v1/user/content_detail', {'url': 'ContentUrl'}),
    'comments': ('本人帖子的评论', '/api/v1/user/content_comments', {'url': 'ContentUrl', 'limit': 'Limit', 'offset': 'Offset'}),
    'stats': ('账号创作数据', '/api/v1/user/creator_account_stats', {'content_type': 'ContentType'}),
    'content_stats': ('单篇创作数据', '/api/v1/user/creator_content_stats', {'url': 'ContentUrl'}),
    'followees': ('我的关注', '/api/v1/user/followees', {'limit': 'Limit', 'offset': 'Offset'}),
    'favorites': ('我的近期收藏', '/api/v1/user/collections', {'limit': 'Limit'}),
    'favlists': ('我的收藏夹', '/api/v1/user/favlists', {'limit': 'Limit'}),
    'favlist_items': ('收藏夹内容', '/api/v1/user/favlist_contents', {'folder_id': 'FavlistUrlToken', 'limit': 'Limit', 'offset': 'Offset'}),
}
LABELS = {name: spec[0] for name, spec in SPECS.items()} | {'answer': '知乎直答'}
QUERY_TOOLS = {'search_zhihu', 'search_global', 'answer'}
URL_TOOLS = {'answers', 'detail', 'comments', 'content_stats'}


def content_url(value, question=False):
    if not isinstance(value, str):
        raise ToolError('内容链接必须是文本', 'INVALID_INPUT')
    u = urlsplit(value)
    if u.scheme != 'https' or u.username or u.password or u.port:
        raise ToolError('请提供知乎 HTTPS 内容链接', 'INVALID_INPUT')
    pattern = r'/question/\d+/?' if question else r'/(?:answer/\d+|question/\d+/answer/\d+|pin/\d+|zvideo/\d+)/?'
    valid = u.hostname == 'www.zhihu.com' and re.fullmatch(pattern, u.path)
    if not question:
        valid = valid or (u.hostname == 'zhuanlan.zhihu.com' and re.fullmatch(r'/p/\d+/?', u.path))
    if not valid:
        raise ToolError('请选择对应的知乎问题或本人内容链接', 'INVALID_INPUT')
    return urlunsplit((u.scheme, u.netloc, u.path, '', ''))


def prepare(name, args):
    if name not in LABELS:
        raise ToolError('不支持此工具；这里只提供查询，不提供发布', 'UNKNOWN_TOOL')
    if not isinstance(args, dict):
        raise ToolError('参数必须是对象', 'INVALID_INPUT')
    allowed = {'query'} if name == 'answer' else set(SPECS[name][2])
    if set(args) - allowed:
        raise ToolError('包含不支持的参数', 'INVALID_INPUT')
    values = dict(args)
    if name in QUERY_TOOLS or (name == 'recommend' and 'query' in values):
        q = values.get('query', '')
        if not isinstance(q, str) or not q.strip() or len(q) > 1000:
            raise ToolError('请填写搜索主题，或先设置兴趣爱好', 'INVALID_INPUT')
        values['query'] = q.strip()
    if name in URL_TOOLS:
        try:
            values['url'] = content_url(values.get('url', ''), name == 'answers')
        except ValueError:
            raise ToolError('无效的内容链接', 'INVALID_INPUT') from None
    if 'limit' in allowed:
        limit = values.setdefault('limit', 5)
        maximum = 10 if name == 'search_zhihu' else 20 if name in {'search_global', 'recommend'} else 30 if name == 'hot' else 50
        if type(limit) is not int or not 1 <= limit <= maximum:
            raise ToolError('查询条数超出允许范围', 'INVALID_INPUT')
    if 'offset' in allowed:
        offset = str(values.setdefault('offset', '0'))
        if not re.fullmatch(r'\d{1,19}', offset) or int(offset) > 2**63-1:
            raise ToolError('分页游标无效', 'INVALID_INPUT')
        values['offset'] = offset
    if 'folder_id' in allowed:
        folder = str(values.get('folder_id', ''))
        if not re.fullmatch(r'[1-9]\d{0,18}', folder) or int(folder) > 2**63-1:
            raise ToolError('请先从收藏夹列表选择收藏夹', 'INVALID_INPUT')
        values['folder_id'] = folder
    if 'content_type' in allowed:
        valid = {'all', 'answer', 'article', 'pin', 'zvideo'}
        if name == 'contents':
            valid.add('question')
        if values.setdefault('content_type', 'all') not in valid:
            raise ToolError('无效的创作类型', 'INVALID_INPUT')
    return values


def safe_numbers(value):
    # Browser JSON.parse must not round content IDs / cursors.
    if type(value) is int and abs(value) > 2**53-1:
        return str(value)
    if isinstance(value, list):
        return [safe_numbers(x) for x in value]
    if isinstance(value, dict):
        return {k: safe_numbers(v) for k, v in value.items()}
    return value


class Zhihu:
    def __init__(self, store, transport=None):
        self.store, self.transport = store, transport

    async def call(self, name, args):
        values = prepare(name, args)
        secret = self.store.secret()
        if not secret:
            raise ToolError('请在设置中保存知乎 Access Secret；不需要连接机器人', 'AUTH_REQUIRED')
        headers = {'Authorization': f'Bearer {secret}', 'X-Request-Timestamp': str(int(time.time())), 'Content-Type': 'application/json'}
        method, path, params, body = 'GET', '', None, None
        if name == 'answer':
            method, path = 'POST', '/v1/chat/completions'
            body = {'model': 'zhida-fast-1p5', 'messages': [{'role': 'user', 'content': values['query']}], 'stream': False}
        else:
            _, path, mapping = SPECS[name]
            params = {mapping[k]: v for k, v in values.items()}
        try:
            async with httpx.AsyncClient(timeout=60 if name == 'answer' else 15, follow_redirects=False, transport=self.transport) as client:
                async with client.stream(method, 'https://developer.zhihu.com' + path, params=params, json=body, headers=headers) as response:
                    if response.status_code != 200:
                        raise ToolError(f'知乎返回 HTTP {response.status_code}，请检查权限或稍后再试', 'UPSTREAM_HTTP')
                    raw = bytearray()
                    async for chunk in response.aiter_bytes():
                        raw.extend(chunk)
                        if len(raw) > 2_000_000:
                            raise ToolError('响应过大，请减小查询范围', 'RESPONSE_TOO_LARGE')
                    import json
                    data = json.loads(raw)
        except (httpx.HTTPError, ValueError):
            raise ToolError('知乎请求超时、网络不可用或响应格式异常；未自动重试', 'NETWORK_ERROR') from None
        if not isinstance(data, dict):
            raise ToolError('知乎响应格式异常', 'PROTOCOL_ERROR')
        if name == 'answer':
            try:
                result = {'Text': data['choices'][0]['message']['content']}
            except (KeyError, IndexError, TypeError):
                raise ToolError('知乎直答未返回有效答案', 'PROTOCOL_ERROR') from None
        else:
            if data.get('Code') != 0:
                code = str(data.get('Code', 'UNKNOWN'))
                meanings = {'20001': '鉴权失败或未授权', '10001': '参数错误、非本人内容或内容不可用', '30001': '频率或额度限制', '30002': '额度已用完', '30003': '风控拒绝'}
                raise ToolError('知乎：' + meanings.get(code, '服务异常') + f'（{code}）', code)
            result = data.get('Data', {})
        return {'tool': name, 'title': LABELS[name], 'args': values, 'data': safe_numbers(result), 'retrieved_at': int(time.time()), 'source': '知乎官方 API', 'identity': 'Access Secret 所属账号', 'summary_only': name in {'search_zhihu', 'search_global', 'answers', 'contents', 'favorites', 'favlist_items'}}


def tool_definitions():
    definitions = []
    for name, title in LABELS.items():
        keys = {'query'} if name == 'answer' else set(SPECS[name][2])
        properties = {k: {'type': 'integer' if k == 'limit' else 'string'} for k in keys}
        required = ['query'] if name in QUERY_TOOLS else ['url'] if name in URL_TOOLS else ['folder_id'] if name == 'favlist_items' else []
        desc = title + '。只读查询，一次取一页，不自动遍历。'
        if name in {'detail', 'comments', 'stats', 'content_stats'}:
            desc += '仅限 Access Secret 所属账号本人，不能代查其他用户。'
        if name == 'recommend':
            desc += '用户指定主题则填 query，否则不传，使用本人画像。'
        definitions.append({'name': 'zhihu_' + name, 'description': desc, 'inputSchema': {'type': 'object', 'properties': properties, 'required': required, 'additionalProperties': False}})
    return definitions
