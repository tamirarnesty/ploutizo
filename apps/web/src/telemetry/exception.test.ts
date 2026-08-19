import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addTelemetryExceptionStep,
  captureBrowserException,
  getPostHogCorrelationHeaders,
} from './exception';
import * as posthogClient from './posthogClient';

describe('browser exception helpers', () => {
  const addExceptionStep = vi.fn();
  const captureException = vi.fn();
  const getSessionId = vi.fn(() => 'session_123');
  const getDistinctId = vi.fn(() => 'user_123');

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(posthogClient, 'getPostHog').mockReturnValue({
      addExceptionStep,
      captureException,
      get_session_id: getSessionId,
      get_distinct_id: getDistinctId,
    } as never);
  });

  it('captures exceptions with safe operation and surface context', () => {
    const error = new Error('boom');

    captureBrowserException(error, {
      operation: 'section.recover',
      surface: 'web.import.review',
      boundary: 'route.error',
    });

    expect(captureException).toHaveBeenCalledWith(error, {
      'telemetry.operation': 'section.recover',
      'telemetry.surface': 'web.import.review',
      'telemetry.boundary': 'route.error',
    });
  });

  it('buffers exception steps for the next capture', () => {
    addTelemetryExceptionStep('review loaded', {
      operation: 'section.render',
      surface: 'web.import.review',
    });

    expect(addExceptionStep).toHaveBeenCalledWith('review loaded', {
      'telemetry.operation': 'section.render',
      'telemetry.surface': 'web.import.review',
    });
  });

  it('returns PostHog correlation headers without throwing when unavailable', () => {
    vi.spyOn(posthogClient, 'getPostHog').mockReturnValue(null);
    expect(getPostHogCorrelationHeaders()).toEqual({});
  });

  it('never throws when PostHog capture fails', () => {
    captureException.mockImplementation(() => {
      throw new Error('posthog down');
    });

    expect(() =>
      captureBrowserException(new Error('x'), {
        operation: 'section.recover',
        surface: 'web.root',
      })
    ).not.toThrow();
  });
});
