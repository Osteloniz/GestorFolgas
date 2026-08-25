import fs from "node:fs";

// The Windows filesystem used by this workspace reports EISDIR when readlink
// is called for a regular, non-symlinked path. Webpack expects EINVAL there.
if (process.platform === "win32") {
  const normalizeReadlinkError = (error) => {
    if (error?.code === "EISDIR") error.code = "EINVAL";
    return error;
  };

  const originalReadlink = fs.readlink;
  fs.readlink = function readlinkWithNormalizedError(...args) {
    const callbackIndex = args.length - 1;
    const callback = args[callbackIndex];

    if (typeof callback === "function") {
      args[callbackIndex] = (error, value) => callback(normalizeReadlinkError(error), value);
    }

    return originalReadlink.apply(this, args);
  };

  const originalReadlinkSync = fs.readlinkSync;
  fs.readlinkSync = function readlinkSyncWithNormalizedError(...args) {
    try {
      return originalReadlinkSync.apply(this, args);
    } catch (error) {
      throw normalizeReadlinkError(error);
    }
  };

  const originalPromiseReadlink = fs.promises.readlink;
  fs.promises.readlink = async function promiseReadlinkWithNormalizedError(...args) {
    try {
      return await originalPromiseReadlink.apply(this, args);
    } catch (error) {
      throw normalizeReadlinkError(error);
    }
  };
}

const nextConfig = {
  reactStrictMode: true,
  webpack(config) {
    config.resolve.symlinks = false;
    return config;
  },
};

export default nextConfig;
