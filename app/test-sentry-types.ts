import { withSentryConfig } from "@sentry/nextjs";

const config = {
    reactStrictMode: true,
};

const sentryOptions = {
    org: "test-org",
    project: "test-project",
    silent: true,
    webpack: {
        treeshake: {
            removeDebugLogging: true,
        },
        automaticVercelMonitors: true,
    }
};

const finalConfig = withSentryConfig(config, sentryOptions);
console.log("Success!");
