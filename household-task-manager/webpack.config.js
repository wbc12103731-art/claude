const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env = {}, argv = {}) {
  // Set the mode if not provided
  const mode = argv.mode || process.env.NODE_ENV || 'development';

  const config = await createExpoWebpackConfigAsync(
    {
      ...env,
      mode,
    },
    argv
  );
  return config;
};
