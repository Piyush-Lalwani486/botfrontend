/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  experimental: {
    optimizePackageImports: ["lucide-react", "@radix-ui/react-select", "@radix-ui/react-dialog"],
  },
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.cache = false
    }
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: "all",
        maxSize: 200000,
        cacheGroups: {
          zxing: {
            test: /[\\/]node_modules[\\/]@zxing[\\/]/,
            name: "zxing",
            chunks: "async",
            priority: 30,
          },
          socketio: {
            test: /[\\/]node_modules[\\/]socket\.io[\\/]/,
            name: "socketio",
            chunks: "async",
            priority: 20,
          },
          vendors: {
            test: /[\\/]node_modules[\\/]/,
            name: "vendors",
            chunks: "all",
            priority: 10,
          },
        },
      },
    }
    return config
  },
}

module.exports = nextConfig
