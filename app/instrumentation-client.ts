import * as Sentry from "@sentry/nextjs";

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    integrations: [
        Sentry.replayIntegration({
            maskAllText: true,
            blockAllMedia: true,
        }),
    ],

    tracesSampleRate: 1,
    debug: false,
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    tunnel: "/monitoring",

    beforeSend(event) {
        if (process.env.NODE_ENV === "development") {
            return null;
        }
        return event;
    },
});

// Required by @sentry/nextjs to instrument router transitions
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
