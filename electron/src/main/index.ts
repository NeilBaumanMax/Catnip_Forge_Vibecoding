import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { flushBrowserStorage, openTabUrl, setupBrowserView, updateBrowserViewBounds } from './browser-view';
import { startGateway } from './gateway';
import { logger } from './worker/logger';
import { getChromeProfileDir, getResourcesDir, isDev } from './paths';
import { checkStartupStatus, configureStartupPreset, getApiKeyPromptData } from './first-run';
import { killAgent } from './agent';
import { askSoftwareAssistant, type SoftwareAssistantMessage } from './software-assistant';
import { startSerialMonitorBridge, stopSerialMonitorBridge } from './serial-monitor-bridge';
import { startAttachmentBridge, stopAttachmentBridge } from './attachment-bridge';
import { stopRadioProcess } from './radio-process';

app.commandLine.appendSwitch('remote-debugging-port', '9230');
// Chromium's compositor materially improves the image-heavy desktop shell. Keep a
// documented escape hatch for machines with broken GPU drivers instead of forcing
// every production user onto software compositing.
if (process.env.CATNIP_DISABLE_GPU === '1') {
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch('disable-gpu-compositing');
}

// 确保用户数据目录存在
const userDataDir = app.getPath('userData');
fs.mkdirSync(userDataDir, { recursive: true });

// Chrome profile 放在 userData 下
const chromeProfileDir = path.join(userDataDir, 'chrome-profile');
fs.mkdirSync(chromeProfileDir, { recursive: true });

let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
let shutdownInFlight: Promise<void> | null = null;
let firstRunRestartScheduled = false;
let splashProgress = { value: 8, status: '正在唤醒 Catnip Forge' };
const SPLASH_MIN_VISIBLE_MS = 5_000;
const SPLASH_COMPLETION_MS = 220;
const RENDERER_INTERACTIVE_TIMEOUT_MS = 8_000;
let splashShownAt = 0;
let splashMainReady = false;
let splashCompletionTimer: ReturnType<typeof setTimeout> | null = null;
let splashCloseTimer: ReturnType<typeof setTimeout> | null = null;
let rendererInteractiveTimer: ReturnType<typeof setTimeout> | null = null;

function clearSplashTimers(): void {
  if (splashCompletionTimer) clearTimeout(splashCompletionTimer);
  if (splashCloseTimer) clearTimeout(splashCloseTimer);
  if (rendererInteractiveTimer) clearTimeout(rendererInteractiveTimer);
  splashCompletionTimer = null;
  splashCloseTimer = null;
  rendererInteractiveTimer = null;
}

function applySplashProgress(): void {
  if (!splashWindow || splashWindow.isDestroyed() || splashWindow.webContents.isLoading()) return;

  const { value, status } = splashProgress;
  const expression = value >= 100
    ? `window.completeSplashProgress?.(${JSON.stringify(status)})`
    : `window.setSplashStage?.(${JSON.stringify(status)})`;
  void splashWindow.webContents
    .executeJavaScript(expression)
    .catch((error) => {
      logger.warn('browser:view-event', { event: 'splash-progress-failed', message: String(error) });
    });
}

function updateSplash(value: number, status: string): void {
  splashProgress = {
    value: Math.max(0, Math.min(100, Math.round(value))),
    status,
  };
  applySplashProgress();
}

function createSplashWindow(): void {
  if (splashWindow && !splashWindow.isDestroyed()) return;

  clearSplashTimers();
  splashShownAt = 0;
  splashMainReady = false;
  splashProgress = { value: 8, status: '正在唤醒 Catnip Forge' };
  splashWindow = new BrowserWindow({
    width: 760,
    height: 470,
    frame: false,
    transparent: true,
    resizable: false,
    movable: true,
    show: false,
    center: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    backgroundColor: '#00000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  splashWindow.loadFile(path.join(__dirname, '..', '..', 'assets', 'splash.html'));
  splashWindow.webContents.once('did-finish-load', () => {
    applySplashProgress();
  });
  splashWindow.once('ready-to-show', () => {
    if (!splashWindow || splashWindow.isDestroyed()) return;
    splashShownAt = Date.now();
    splashWindow.show();
    void splashWindow.webContents
      .executeJavaScript(`window.startSplashTimeline?.(${SPLASH_MIN_VISIBLE_MS})`)
      .catch((error) => {
        logger.warn('browser:view-event', { event: 'splash-timeline-failed', message: String(error) });
      });
    scheduleSplashCompletion();
  });
  splashWindow.on('closed', () => {
    clearSplashTimers();
    splashShownAt = 0;
    splashWindow = null;
  });
}

function revealMainWindow(): void {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close();
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.setBackgroundThrottling(true);
    mainWindow.show();
    mainWindow.focus();
  }
}

function scheduleSplashCompletion(): void {
  if (!splashMainReady || !splashShownAt || !splashWindow || splashWindow.isDestroyed()) return;

  if (splashCompletionTimer) clearTimeout(splashCompletionTimer);
  const elapsed = Date.now() - splashShownAt;
  const remaining = Math.max(0, SPLASH_MIN_VISIBLE_MS - elapsed);

  splashCompletionTimer = setTimeout(() => {
    splashCompletionTimer = null;
    updateSplash(100, '准备就绪');
    if (process.env.VIBEIDE_SPLASH_HOLD === '1') return;

    splashCloseTimer = setTimeout(() => {
      splashCloseTimer = null;
      revealMainWindow();
    }, SPLASH_COMPLETION_MS);
  }, remaining);
}

function finishSplash(): void {
  if (rendererInteractiveTimer) clearTimeout(rendererInteractiveTimer);
  rendererInteractiveTimer = null;
  splashMainReady = true;
  scheduleSplashCompletion();
}

function scheduleFirstRunRestart(): void {
  if (firstRunRestartScheduled) return;
  firstRunRestartScheduled = true;
  logger.info('first-run:restart-scheduled', { delayMs: 900 });
  setTimeout(() => {
    logger.info('first-run:restarting');
    app.relaunch();
    app.quit();
  }, 900);
}

function isShellUrl(url: string): boolean {
  return (
    url.startsWith('http://localhost:5173') ||
    url.startsWith('http://127.0.0.1:5173') ||
    url.includes('/renderer/index.html') ||
    url === 'about:blank'
  );
}

async function shutdownApp(reason: string): Promise<void> {
  if (shutdownInFlight) {
    await shutdownInFlight;
    return;
  }

  shutdownInFlight = (async () => {
    logger.warn('browser:view-event', { event: 'shutdown', reason });
    killAgent();
    await stopAttachmentBridge();
    await stopRadioProcess();
    await stopSerialMonitorBridge();
    await flushBrowserStorage();
    clearSplashTimers();

    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.destroy();
    }

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.destroy();
    }

    splashWindow = null;
    mainWindow = null;
  })();

  await shutdownInFlight;
}

function createWindow() {
  updateSplash(22, '正在准备工作区');
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 800,
    minHeight: 600,
    show: false,
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: '#1a1b26',
    title: 'Catnip Forge · Catnip 硬件智能开发平台',
    icon: path.join(getResourcesDir(), 'electron', 'assets', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
    },
  });
  mainWindow.setMenuBarVisibility(false);

  const syncBrowserBounds = () => updateBrowserViewBounds();
  const resyncBrowserBounds = () => {
    syncBrowserBounds();
    [50, 150, 400, 1000].forEach((delay) => {
      setTimeout(syncBrowserBounds, delay);
    });
  };

  mainWindow.on('resize', resyncBrowserBounds);
  mainWindow.on('maximize', resyncBrowserBounds);
  mainWindow.on('unmaximize', resyncBrowserBounds);
  mainWindow.on('enter-full-screen', resyncBrowserBounds);
  mainWindow.on('leave-full-screen', resyncBrowserBounds);

  setupBrowserView(mainWindow);
  startGateway(mainWindow);
  updateSplash(48, '正在连接开发环境');

  // 首次启动检查
  const startupStatus = checkStartupStatus();
  logger.info('first-run:status', startupStatus as unknown as Record<string, unknown>);

  // 注册 IPC 处理器
  ipcMain.handle('startup:status', () => ({ ...checkStartupStatus(), ...getApiKeyPromptData() }));
  ipcMain.handle('startup:configure-model', async () => {
    const result = await configureStartupPreset();
    if (result.ok) scheduleFirstRunRestart();
    return { ...result, restarting: result.ok };
  });
  ipcMain.handle('startup:restart-after-model-setup', async () => {
    if (checkStartupStatus().firstRun) throw new Error('请先完成并启用模型供应商配置');
    scheduleFirstRunRestart();
    return { restarting: true };
  });
  ipcMain.handle('software-assistant:ask', async (_event, messages: SoftwareAssistantMessage[]) => {
    return askSoftwareAssistant(Array.isArray(messages) ? messages : []);
  });
  ipcMain.removeAllListeners('renderer:interactive');
  ipcMain.on('renderer:interactive', (event) => {
    if (!mainWindow || mainWindow.isDestroyed() || event.sender !== mainWindow.webContents) return;
    updateSplash(94, '首屏资源已就绪');
    finishSplash();
  });
  ipcMain.removeHandler('window:minimize');
  ipcMain.removeHandler('window:toggle-maximize');
  ipcMain.removeHandler('window:close');
  ipcMain.handle('window:minimize', (event) => {
    const owner = BrowserWindow.fromWebContents(event.sender);
    if (!owner || owner.isDestroyed()) return { ok: false };
    owner.minimize();
    return { ok: true };
  });
  ipcMain.handle('window:toggle-maximize', (event) => {
    const owner = BrowserWindow.fromWebContents(event.sender);
    if (!owner || owner.isDestroyed()) return { ok: false, maximized: false };
    if (owner.isMaximized()) owner.unmaximize();
    else owner.maximize();
    return { ok: true, maximized: owner.isMaximized() };
  });
  ipcMain.handle('window:close', (event) => {
    const owner = BrowserWindow.fromWebContents(event.sender);
    if (!owner || owner.isDestroyed()) return { ok: false };
    owner.close();
    return { ok: true };
  });

  if (process.env.NODE_ENV === 'development' || process.env.ELECTRON_DEV === '1') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  }

  mainWindow.webContents.on('did-finish-load', () => {
    updateSplash(84, '正在载入工作台');
    resyncBrowserBounds();
    if (splashMainReady || rendererInteractiveTimer) return;
    rendererInteractiveTimer = setTimeout(() => {
      rendererInteractiveTimer = null;
      logger.warn('browser:view-event', {
        event: 'renderer-interactive-timeout',
        timeoutMs: RENDERER_INTERACTIVE_TIMEOUT_MS,
      });
      finishSplash();
    }, RENDERER_INTERACTIVE_TIMEOUT_MS);
  });
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    logger.warn('browser:view-event', { event: 'splash-main-load-failed', errorCode, errorDescription });
    updateSplash(100, '界面载入失败，请检查运行环境');
    if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
    mainWindow?.show();
  });
  mainWindow.webContents.on('did-navigate-in-page', resyncBrowserBounds);
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (isShellUrl(url)) return;

    event.preventDefault();
    logger.warn('browser:view-event', {
      event: 'shell-navigation-blocked',
      url,
    });
    if (/^https?:|^file:/i.test(url)) {
      openTabUrl(url, true);
      resyncBrowserBounds();
    }
  });
  mainWindow.webContents.on('did-start-navigation', (details) => {
    logger.info('browser:view-event', {
      event: 'shell-did-start-navigation',
      url: details.url,
      isMainFrame: details.isMainFrame,
      isSameDocument: details.isSameDocument,
    });
  });
  mainWindow.webContents.on('page-title-updated', () => {
    logger.warn('browser:view-event', {
      event: 'shell-title-updated',
      shellUrl: mainWindow?.webContents.getURL() || '',
      shellTitle: mainWindow?.webContents.getTitle() || '',
    });
  });
  mainWindow.once('ready-to-show', () => {
    resyncBrowserBounds();
    updateSplash(90, '正在预热首屏资源');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  await startSerialMonitorBridge();
  await startAttachmentBridge();
  createSplashWindow();
  createWindow();
});

app.on('web-contents-created', (_event, contents) => {
  logger.warn('browser:webcontents-created', {
    id: contents.id,
    type: contents.getType(),
    url: contents.getURL(),
  });

  contents.setWindowOpenHandler(({ url }) => {
    logger.warn('browser:window-open', {
      source: `webcontents:${contents.getType()}`,
      ownerId: contents.id,
      ownerUrl: contents.getURL(),
      url,
    });
    if (url && /^https?:|^file:/i.test(url)) {
      openTabUrl(url, true);
    }
    return { action: 'deny' };
  });

  contents.on('did-create-window', (window, details) => {
    logger.warn('browser:window-created', {
      source: `webcontents:${contents.getType()}`,
      ownerId: contents.id,
      ownerUrl: contents.getURL(),
      childTitle: window.getTitle(),
      url: details.url,
      frameName: details.frameName,
      disposition: details.disposition,
      referrer: details.referrer?.url || '',
    });
  });
});

app.on('browser-window-created', (_event, window) => {
  logger.warn('browser:window-created', {
    source: 'app',
    id: window.webContents.id,
    title: window.getTitle(),
    url: window.webContents.getURL(),
  });
});

app.on('window-all-closed', () => {
  void shutdownApp('window-all-closed').finally(() => {
    app.quit();
  });
});

app.on('activate', () => {
  if (mainWindow === null) {
    createSplashWindow();
    createWindow();
  }
});

app.on('before-quit', (event) => {
  if (!mainWindow) return;
  event.preventDefault();
  void shutdownApp('before-quit').finally(() => {
    app.exit(0);
  });
});

process.on('SIGTERM', () => {
  void shutdownApp('sigterm').finally(() => {
    app.exit(0);
  });
});

process.on('SIGINT', () => {
  void shutdownApp('sigint').finally(() => {
    app.exit(0);
  });
});
