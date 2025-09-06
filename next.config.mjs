/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    forceSwcTransforms: false, // Use Babel for better compatibility
  },
  transpilePackages: ['@juggle/resize-observer'],
  compiler: {
    removeConsole: false, // Keep console for debugging
  },
  webpack: (config, { dev, isServer }) => {
    // Add polyfills for older browsers
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        dns: false,
        child_process: false,
        tls: false,
      };
    }
    return config;
  },
}

export default nextConfig;
