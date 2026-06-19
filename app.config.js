/**
 * Dynamic Expo config.
 *
 * Google Maps API keys are injected from EAS Secrets at build time so they
 * never sit in source control. See eas.json for the secret bindings and
 * .env.example for local-dev usage.
 */
module.exports = () => ({
  expo: {
    name: "FuelUK",
    slug: "fueluk-mobile-app",
    scheme: "fueluk",
    version: "1.0.0",
    runtimeVersion: {
      policy: "appVersion",
    },
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "cover",
      backgroundColor: "#00B86B",
    },
    updates: {
      fallbackToCacheTimeout: 0,
      checkAutomatically: "ON_LOAD",
      url: "https://u.expo.dev/6a52b661-f990-4436-9ecb-49148533d02b",
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.freefuelpriceapp.uk",
      buildNumber: "2",
      // Maps API key is injected by the react-native-maps config plugin
      // below — do NOT also set ios.config.googleMapsApiKey here, the
      // two sources collide in the generated manifest and the SDK ends
      // up with no usable key (tiles silently never load).
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          "FuelUK uses your location to show fuel stations near you, sorted by distance and price. Your location is never stored or shared.",
        UIBackgroundModes: ["remote-notification"],
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#00B86B",
      },
      package: "com.freefuelpriceapp.uk",
      versionCode: 7,
      // Maps API key is injected by the react-native-maps config plugin
      // below — do NOT also set android.config.googleMaps.apiKey here,
      // the two sources both write com.google.android.geo.API_KEY into
      // AndroidManifest.xml and the duplicate meta-data tag results in
      // the SDK reading an empty/unresolved key (tiles silently fail).
      permissions: [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "VIBRATE",
      ],
    },
    plugins: [
      [
        "expo-location",
        {
          locationWhenInUsePermission:
            "FuelUK uses your location to show fuel stations near you, sorted by distance and price. Your location is never stored or shared.",
        },
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/notification-icon.png",
          color: "#00B86B",
          defaultChannel: "price-alerts",
        },
      ],
      [
        "react-native-maps",
        {
          androidGoogleMapsApiKey: "AIzaSyAdHxdIcgmP83ttY9KvfKkulAJRBI5GpW8",
          iosGoogleMapsApiKey: "AIzaSyAgf9-8v_m_kWPyAkctx_2lORMwkBYDtvg",
        },
      ],
      "./plugins/withAdiRegistration.js",
    ],
    extra: {
      apiBaseUrl: "https://api.freefuelpriceapp.com",
      eas: {
        projectId: "6a52b661-f990-4436-9ecb-49148533d02b",
      },
    },
  },
});
