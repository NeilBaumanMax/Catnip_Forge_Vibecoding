import exploreAcademyHero from './assets/explore-academy-hero.jpg';
import chatHistoryNight from './assets/liukanshan-chat-history-night.jpg';

const MAX_CRITICAL_PRELOAD_MS = 2_500;

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

async function decodeImage(image: HTMLImageElement): Promise<void> {
  if (!image.complete) {
    await new Promise<void>((resolve) => {
      image.addEventListener('load', () => resolve(), { once: true });
      image.addEventListener('error', () => resolve(), { once: true });
    });
  }
  if (typeof image.decode === 'function') await image.decode().catch(() => undefined);
}

function preloadBackground(source: string): Promise<void> {
  const image = new Image();
  image.decoding = 'async';
  image.src = source;
  return decodeImage(image);
}

export async function notifyWhenRendererInteractive(): Promise<void> {
  await nextFrame();

  const visibleImages = Array.from(document.images).filter((image) => {
    const bounds = image.getBoundingClientRect();
    return bounds.width > 0 && bounds.height > 0;
  });
  const fontReady = document.fonts?.ready ?? Promise.resolve();
  const criticalResources = Promise.allSettled([
    fontReady,
    ...visibleImages.map((image) => decodeImage(image)),
    preloadBackground(exploreAcademyHero),
    preloadBackground(chatHistoryNight),
  ]);
  const timeout = new Promise<void>((resolve) => {
    window.setTimeout(resolve, MAX_CRITICAL_PRELOAD_MS);
  });

  await Promise.race([criticalResources, timeout]);
  await nextFrame();
  await nextFrame();
  performance.mark('catnip-renderer-interactive');
  window.electronAPI?.notifyRendererInteractive?.();
}
