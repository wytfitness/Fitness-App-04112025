// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

// Force a single copy of react-native-svg
config.resolver = {
  ...(config.resolver || {}),
  extraNodeModules: {
    ...(config.resolver?.extraNodeModules || {}),
    'react-native-svg': path.resolve(projectRoot, 'node_modules/react-native-svg'),
  },
  // If you previously added watchFolders pointing outside the project,
  // keep only what you really need. Each extra folder can bring another copy.
  // watchFolders: [projectRoot], // (usually not needed with Expo)
};

module.exports = config;
