import type { NextConfig } from "next";

import buildTracingPolicy from "./build-tracing-policy.json";
import { isSklandFeatureEnabled } from "./src/deployment";

const outputFileTracingExcludes = [
  ...buildTracingPolicy.excludedDirectories.map((directory) => `./${directory}/**/*`),
  ...buildTracingPolicy.excludedFiles.map((file) => `./${file}`),
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  env: {
    APP_CLIENT_SKLAND_ENABLED: isSklandFeatureEnabled() ? "1" : "0",
  },
  outputFileTracingExcludes: {
    "/*": outputFileTracingExcludes,
  },
  typedRoutes: false,
};

export default nextConfig;
