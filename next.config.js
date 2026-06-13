const { PHASE_DEVELOPMENT_SERVER } = require("next/constants");

/** @type {import('next').NextConfig} */
module.exports = (phase) => {
  const isDevelopment = phase === PHASE_DEVELOPMENT_SERVER;

  return {
    reactStrictMode: true,
    poweredByHeader: false,
    distDir: isDevelopment ? ".next-dev" : ".next",
    async headers() {
      const headers = [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "same-origin" },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=()",
        },
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            `script-src 'self' 'unsafe-inline'${
              isDevelopment ? " 'unsafe-eval'" : ""
            }`,
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob:",
            "font-src 'self' data:",
            "connect-src 'self'",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
          ].join("; "),
        },
      ];

      if (!isDevelopment) {
        headers.push({
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains",
        });
      }

      return [
        { source: "/(.*)", headers },
        {
          source: "/api/:path*",
          headers: [
            {
              key: "Cache-Control",
              value: "no-store, max-age=0, must-revalidate",
            },
          ],
        },
      ];
    },
  };
};
