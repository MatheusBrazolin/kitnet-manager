import * as Sentry from '@sentry/node';
import {
  initSentry,
  captureException,
  isSentryEnabled,
  resetSentryForTests,
} from './sentry';

jest.mock('@sentry/node', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
}));

describe('sentry observability helper', () => {
  const originalDsn = process.env.SENTRY_DSN;

  afterEach(() => {
    process.env.SENTRY_DSN = originalDsn;
    resetSentryForTests();
    jest.clearAllMocks();
  });

  it('does nothing when SENTRY_DSN is not set', () => {
    delete process.env.SENTRY_DSN;

    initSentry();
    captureException(new Error('boom'));

    expect(Sentry.init).not.toHaveBeenCalled();
    expect(Sentry.captureException).not.toHaveBeenCalled();
    expect(isSentryEnabled()).toBe(false);
  });

  it('initializes Sentry and forwards exceptions when SENTRY_DSN is set', () => {
    process.env.SENTRY_DSN = 'https://example.invalid/1';

    initSentry();
    const error = new Error('boom');
    captureException(error);

    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({ dsn: process.env.SENTRY_DSN }),
    );
    expect(Sentry.captureException).toHaveBeenCalledWith(error);
    expect(isSentryEnabled()).toBe(true);
  });
});
