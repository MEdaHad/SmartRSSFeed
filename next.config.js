/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer, dev }) => {
    // Increase chunk loading timeout
    config.watchOptions = {
      aggregateTimeout: 300,
      poll: 1000,
    };

    // Optimize for development
    if (dev) {
      config.optimization.splitChunks = {
        chunks: 'all',
        minSize: 20000,
        maxSize: 70000,
        cacheGroups: {
          default: false,
          vendors: false,
          // Vendor chunk
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /node_modules/,
            priority: 20,
          },
          // Common chunk
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true,
            enforce: true,
          },
        },
      };
    }

    if (!isServer) {
      // Client-side specific settings
      config.optimization.runtimeChunk = 'single';
      config.output.chunkLoadTimeout = 60000; // 60 seconds
      
      // Add retry logic for chunk loading
      const originalEntry = config.entry;
      config.entry = async () => {
        const entries = await originalEntry();
        if (entries['main.js']) {
          entries['main.js'].unshift('./src/app/lib/chunkLoader.ts');
        }
        return entries;
      };
    }

    return config;
  },
  // Production optimizations
  swcMinify: true,
  compress: true,
  productionBrowserSourceMaps: false,
  // Increase serverTimeout
  serverRuntimeConfig: {
    // Will only be available on the server side
    timeoutMs: 60000, // 60 seconds
  },
  // Add powered by header
  poweredByHeader: false,
  reactStrictMode: true,
};

module.exports = nextConfig; 