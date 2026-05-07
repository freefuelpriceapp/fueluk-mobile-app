// Copies adi-registration.properties into Android app/src/main/assets/
// during EAS prebuild so it is bundled into the release APK at
// /assets/adi-registration.properties — required by Google Play Console
// package name verification (adi = Android Developer Id).
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withAdiRegistration = (config) => {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const src = path.join(projectRoot, 'android-token', 'adi-registration.properties');
      const destDir = path.join(
        cfg.modRequest.platformProjectRoot,
        'app', 'src', 'main', 'assets'
      );
      const dest = path.join(destDir, 'adi-registration.properties');
      if (!fs.existsSync(src)) {
        throw new Error('[withAdiRegistration] missing ' + src);
      }
      fs.mkdirSync(destDir, { recursive: true });
      fs.copyFileSync(src, dest);
      console.log('[withAdiRegistration] wrote ' + dest);
      return cfg;
    },
  ]);
};

module.exports = withAdiRegistration;
