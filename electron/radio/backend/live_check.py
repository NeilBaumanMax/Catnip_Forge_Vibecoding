"""Opt-in minimal live checks. Prints counts/status only, never credentials or private bodies."""
import asyncio
import os
from pathlib import Path
from .store import Store
from .zhihu import Zhihu, ToolError


async def main():
    default_root = Path(__file__).resolve().parents[1] / '.runtime'
    client = Zhihu(Store(Path(os.getenv('FORGE_DATA_DIR', default_root))))
    own_url = None
    for name, args in [('search_zhihu', {'query': '机器人', 'limit': 1}), ('hot', {'limit': 1}), ('contents', {'limit': 1})]:
        try:
            result = await client.call(name, args)
            items = result['data'].get('Items', [])
            print(f'{name}: OK, {len(items)} item(s)', flush=True)
            if name == 'contents' and items and items[0].get('ContentType') != 'question':
                own_url = items[0].get('Url')
        except ToolError as e:
            print(f'{name}: FAILED, {e.code}: {e}', flush=True)
            if e.code in {'20001', 'AUTH_REQUIRED', '30001', '30002', '30003'}:
                break
    if own_url:
        for name in ['detail', 'comments']:
            try:
                result = await client.call(name, {'url': own_url})
                print(f'{name}: OK (private body not logged)', flush=True)
            except ToolError as e:
                print(f'{name}: FAILED, {e.code}: {e}', flush=True)
                if e.code in {'30001', '30002', '30003'}:
                    break
    else:
        print('detail/comments: SKIPPED, no usable own-content URL', flush=True)


if __name__ == '__main__':
    asyncio.run(main())
