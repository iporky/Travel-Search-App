module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Reanimated 4 runs its animations on the UI thread as worklets; this
    // plugin compiles them. It has to be the LAST plugin in the list.
    plugins: ['react-native-worklets/plugin'],
  };
};
