const appJson = require('./app.json');

/** @type {import('expo/config').ExpoConfig} */
module.exports = () => ({
  expo: {
    ...appJson.expo,
    extra: {
      ...appJson.expo.extra,
      eas: {
        projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? appJson.expo.extra?.eas?.projectId,
      },
    },
  },
});
