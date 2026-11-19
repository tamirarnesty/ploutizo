import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerServiceWorkerUpdatePrompt } from './register-service-worker-update';

const registerSW = vi.hoisted(() => vi.fn());
const toast = vi.hoisted(() => vi.fn());

vi.mock('virtual:pwa-register', () => ({
  registerSW,
}));

vi.mock('@ploutizo/ui/components/sonner-api', () => ({
  toast,
}));

const updateServiceWorker = vi.fn();

const setServiceWorker = (present: boolean) => {
  if (present) {
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {},
    });
    return;
  }
  Reflect.deleteProperty(navigator, 'serviceWorker');
};

describe('registerServiceWorkerUpdatePrompt', () => {
  beforeEach(() => {
    registerSW.mockReset();
    toast.mockReset();
    updateServiceWorker.mockReset();
    registerSW.mockReturnValue(updateServiceWorker);
    vi.unstubAllEnvs();
    setServiceWorker(false);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    setServiceWorker(false);
  });

  it('does not register during development', () => {
    vi.stubEnv('PROD', false);
    setServiceWorker(true);

    registerServiceWorkerUpdatePrompt();

    expect(registerSW).not.toHaveBeenCalled();
  });

  it('does not register when the browser has no service worker', () => {
    vi.stubEnv('PROD', true);

    registerServiceWorkerUpdatePrompt();

    expect(registerSW).not.toHaveBeenCalled();
  });

  it('shows a refresh toast and updates only after the member accepts', () => {
    vi.stubEnv('PROD', true);
    setServiceWorker(true);

    registerServiceWorkerUpdatePrompt();

    expect(registerSW).toHaveBeenCalledOnce();
    const options = registerSW.mock.calls[0]?.[0] as {
      onNeedRefresh?: () => void;
    };
    options.onNeedRefresh?.();

    expect(updateServiceWorker).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(
      'New version available',
      expect.objectContaining({
        id: 'service-worker-update-available',
        duration: Infinity,
        action: expect.objectContaining({ label: 'Refresh' }),
      })
    );

    const action = toast.mock.calls[0]?.[1]?.action as { onClick: () => void };
    action.onClick();

    expect(updateServiceWorker).toHaveBeenCalledOnce();
    expect(updateServiceWorker).toHaveBeenCalledWith(true);
  });
});
