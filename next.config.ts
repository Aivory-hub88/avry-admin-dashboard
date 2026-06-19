import type { NextConfig } from "next";

// Guard: NEXT_PUBLIC_API_URL must be set
if (!process.env.NEXT_PUBLIC_API_URL) {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_API_URL is not set. This environment variable is required in production."
    );
  } else {
    console.warn(
      "[aivory-admin] WARNING: NEXT_PUBLIC_API_URL is not set. API calls will fail. " +
        "Create a .env.local file with NEXT_PUBLIC_API_URL=http://localhost:8000"
    );
  }
}

const nextConfig: NextConfig = {
  output: "standalone",
  basePath: "/admin",
  assetPrefix: "/admin",
  reactStrictMode: true,
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/i,
      use: [
        {
          loader: "@svgr/webpack",
          options: {
            svgo: false,
            titleProp: true,
            ref: true,
          },
        },
      ],
    });
    return config;
  },

  turbopack: {
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },
};

export default nextConfig;
