const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ignore problematic directories that get deleted/recreated
config.resolver.blockList = [
  ...config.resolver.blockList,
  /\.local\/skills\/\./,
  /\.local\/state\//,
  /\.local\/tasks\//,
  /\.local\/session_plan\.md/,
  /\.local\/\.old-/,
];

// Also exclude from file watching
config.watchFolders = (config.watchFolders || []).filter(
  (folder) => !folder.includes('.local')
);

module.exports = config;
