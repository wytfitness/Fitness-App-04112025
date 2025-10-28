// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],   // ✅ SDK 50+ preset (includes Expo Router bits)
    plugins: ['react-native-reanimated/plugin'], // keep others you use, but NOT "expo-router/babel"
  };
};
