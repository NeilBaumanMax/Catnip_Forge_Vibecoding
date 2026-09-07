import type { IpcMain } from 'electron';
import {
  normalizeExploreRequest,
  type ExploreRequestPreparation,
  type ExploreZhihuConnectionStatus,
} from '../common/explore';
import { readExploreZhihuConnectionStatus } from './explore-zhihu-status';

export function prepareExploreRequest(
  value: unknown,
  connection: ExploreZhihuConnectionStatus,
): ExploreRequestPreparation {
  const request = normalizeExploreRequest(value);
  const selectedContext = request.context.items.filter((item) => item.selected);
  const connected = connection.state === 'connected';

  return {
    request: {
      ...request,
      context: { items: selectedContext },
    },
    selectedContext,
    sourceStrategy: {
      zhihu: 'required',
      web: request.mode === 'diagnosis' ? 'required' : 'conditional',
    },
    state: connected ? 'ready' : 'needs_connection',
    message: connected
      ? '请求与最小 Context 已准备，可以开始检索。'
      : connection.message,
  };
}

export function registerExploreRequestIpc(
  registrar: Pick<IpcMain, 'handle'>,
  readConnection = readExploreZhihuConnectionStatus,
): void {
  registrar.handle('explore:request:prepare', async (_event, value: unknown) => {
    const connection = await readConnection();
    return prepareExploreRequest(value, connection);
  });
}
