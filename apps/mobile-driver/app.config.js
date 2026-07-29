const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const IS_LOCAL = process.env.APP_ENV === 'local';

// New identity — no pre-existing EAS project/App Store listing for the
// driver app (the old shared 'woyo' variant/EAS project was repurposed
// for Passenger; Driver is a clean split). Run `eas init` once ready to
// build and set WOYO_DRIVER_EAS_PROJECT_ID, or replace the placeholder below.
const EAS_PROJECT_ID = process.env.WOYO_DRIVER_EAS_PROJECT_ID || 'TODO_RUN_EAS_INIT';

// Woyo brand — deep indigo ground, warm marigold-gold mark (matches
// 225woyo.com). Icon/splash/adaptive-icon assets: assets/woyo-*.png.
const WOYO_INDIGO = '#1B1440';
const WOYO_GOLD = '#F4A825';

const appName = 'Woyo Chauffeur';
const packageName = 'com.woyo.driver.app';
const scheme = 'woyo-driver';

// Pins api.tekeche.com to ISRG Root X1 (stable across Let's Encrypt cert rotations)
// plus the current leaf cert. Leaf pin expires 2026-08-19 — update before then.
const withNetworkSecurity = (config) => {
  config = withAndroidManifest(config, (c) => {
    const app = c.modResults.manifest.application?.[0];
    if (app) app.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    return c;
  });
  config = withDangerousMod(config, [
    'android',
    (c) => {
      const xmlDir = path.join(c.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res', 'xml');
      fs.mkdirSync(xmlDir, { recursive: true });
      const networkSecurityXml = IS_LOCAL
        ? `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <!-- Local dev build: allow cleartext and user-installed CAs so the device
       can reach a local dev API and any local HTTPS proxy -->
  <base-config cleartextTrafficPermitted="true">
    <trust-anchors>
      <certificates src="system"/>
      <certificates src="user"/>
    </trust-anchors>
  </base-config>
</network-security-config>
`
        : `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <domain-config cleartextTrafficPermitted="false">
    <domain includeSubdomains="false">api.tekeche.com</domain>
    <pin-set expiration="2026-08-19">
      <!-- api.tekeche.com leaf cert (expires 2026-08-19) -->
      <pin digest="SHA-256">izr4vuvywebtfhrGXM+MV5kjtAwNEwzoaCA3h3/JyIE=</pin>
      <!-- ISRG Root X1 — permanent backup, valid for all Let's Encrypt certs -->
      <pin digest="SHA-256">9Fk6HgfMnM7/vtnBHcUhg1b3gU2bIpSd50XmKZkMbGA=</pin>
    </pin-set>
  </domain-config>
</network-security-config>
`;
      fs.writeFileSync(
        path.join(xmlDir, 'network_security_config.xml'),
        networkSecurityXml
      );
      return c;
    },
  ]);
  return config;
};

// Explicitly removes AD_ID permission injected by Google Play Services
const withRemoveAdIdPermission = (config) =>
  withAndroidManifest(config, (c) => {
    const manifest = c.modResults.manifest;
    if (!manifest.$['xmlns:tools']) {
      manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }
    if (!manifest['uses-permission']) manifest['uses-permission'] = [];
    const already = manifest['uses-permission'].some(
      (p) => p.$?.['android:name'] === 'com.google.android.gms.permission.AD_ID'
    );
    if (!already) {
      manifest['uses-permission'].push({
        $: { 'android:name': 'com.google.android.gms.permission.AD_ID', 'tools:node': 'remove' },
      });
    }
    return c;
  });

module.exports = withNetworkSecurity(withRemoveAdIdPermission({
  expo: {
    name: appName,
    slug: 'woyo-driver',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/woyo-icon.png',
    userInterfaceStyle: 'dark',
    newArchEnabled: true,
    scheme: scheme,
    updates: {
      enabled: true,
      fallbackToCacheTimeout: 0,
      checkAutomatically: 'ON_LOAD',
    },
    runtimeVersion: { policy: 'appVersion' },
    splash: {
      image: './assets/woyo-splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: WOYO_INDIGO,
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: packageName,
      buildNumber: '1',
      infoPlist: {
        NSLocationWhenInUseUsageDescription: `${appName} utilise votre position pour les courses.`,
        NSLocationAlwaysAndWhenInUseUsageDescription: `${appName} utilise votre position pour le suivi de course en arrière-plan.`,
        NSCameraUsageDescription: 'Utilisé pour la vérification KYC du chauffeur.',
        ITSAppUsesNonExemptEncryption: false,
        UIBackgroundModes: ['location', 'fetch'],
      },
      config: {
        googleMapsApiKey: 'AIzaSyBOPZ6_UZHwuyKtQOyugnMjt8hs-JlGapQ',
      },
    },
    android: {
      package: packageName,
      adaptiveIcon: {
        foregroundImage: './assets/woyo-adaptive-icon.png',
        backgroundColor: WOYO_INDIGO,
      },
      permissions: [
        'ACCESS_FINE_LOCATION',
        'ACCESS_COARSE_LOCATION',
        'CAMERA',
        'READ_EXTERNAL_STORAGE',
        'READ_MEDIA_IMAGES',
        'android.permission.ACCESS_COARSE_LOCATION',
        'android.permission.ACCESS_FINE_LOCATION',
        'ACCESS_BACKGROUND_LOCATION',
        'FOREGROUND_SERVICE',
        'FOREGROUND_SERVICE_LOCATION',
        'android.permission.ACCESS_BACKGROUND_LOCATION',
      ],
      config: {
        googleMaps: {
          apiKey: 'AIzaSyBOPZ6_UZHwuyKtQOyugnMjt8hs-JlGapQ',
        },
      },
    },
    plugins: [
      'expo-router',
      'expo-updates',
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission:
            `${appName} utilise votre position pour le suivi de course en arrière-plan.`,
          isIosBackgroundLocationEnabled: true,
          isAndroidBackgroundLocationEnabled: true,
        },
      ],
      'expo-task-manager',
      [
        'expo-notifications',
        {
          icon: './assets/woyo-icon.png',
          color: WOYO_GOLD,
          androidMode: 'default',
          androidCollapsedTitle: appName,
        },
      ],
      'expo-font',
      [
        'expo-image-picker',
        {
          photosPermission: 'Utilisé pour uploader vos documents KYC.',
          cameraPermission: 'Utilisé pour prendre des photos KYC.',
        },
      ],
    ],
    extra: {
      router: {},
      eas: {
        projectId: EAS_PROJECT_ID,
      },
    },
    owner: 'livbiko',
  },
}));
