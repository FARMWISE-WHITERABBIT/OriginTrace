// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const replaySampleRate = Number(process.env.NEXT_PUBLIC_SENTRY_REPLAY_SAMPLE_RATE ?? '0');
const replayOnErrorSampleRate = Number(process.env.NEXT_PUBLIC_SENTRY_REPLAY_ON_ERROR_SAMPLE_RATE ?? '0.25');

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,

    integrations:
      replaySampleRate > 0 || replayOnErrorSampleRate > 0
        ? [Sentry.replayIntegration()]
        : [],

    // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
    tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
    // Enable logs to be sent to Sentry
    enableLogs: true,

    // Replay is opt-in for normal sessions and lightly sampled for error sessions by default.
    replaysSessionSampleRate: Number.isFinite(replaySampleRate) ? replaySampleRate : 0,
    replaysOnErrorSampleRate: Number.isFinite(replayOnErrorSampleRate) ? replayOnErrorSampleRate : 0.25,

    // Enable sending user PII (Personally Identifiable Information)
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
    sendDefaultPii: true,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
