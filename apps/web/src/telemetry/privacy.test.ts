import { describe, expect, it } from 'vitest';
import {
  TELEMETRY_REPLAY_BLOCK_ATTR,
  TELEMETRY_REPLAY_BLOCK_SELECTOR,
  buildPostHogInitOptions,
  buildSessionRecordingOptions,
} from './privacy';

describe('browser telemetry privacy config', () => {
  it('masks all text and inputs and blocks finance surfaces', () => {
    expect(buildSessionRecordingOptions()).toEqual({
      maskAllInputs: true,
      maskTextSelector: '*',
      blockClass: 'ph-no-capture',
      blockSelector: TELEMETRY_REPLAY_BLOCK_SELECTOR,
    });
    expect(TELEMETRY_REPLAY_BLOCK_SELECTOR).toBe(`[${TELEMETRY_REPLAY_BLOCK_ATTR}]`);
  });

  it('disables console autocapture and masks element attributes', () => {
    const options = buildPostHogInitOptions({
      appEnv: 'local',
      serviceName: 'ploutizo-web',
      release: 'abc',
      posthogToken: 'phc_test',
      posthogHost: 'https://us.i.posthog.com',
      exportEnabled: true,
      mirrorConsole: true,
    });

    expect(options.autocapture).toBe(false);
    expect(options.mask_all_element_attributes).toBe(true);
    expect(options.logs).toMatchObject({
      captureConsoleLogs: false,
      serviceName: 'ploutizo-web',
      environment: 'local',
      serviceVersion: 'abc',
    });
    expect(options.session_recording).toEqual(buildSessionRecordingOptions());
  });
});
