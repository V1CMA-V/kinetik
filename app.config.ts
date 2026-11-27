import type { ConfigContext, ExpoConfig } from 'expo/config';

// Extends app.json. google-services.json is git-ignored: EAS builds get it from
// the GOOGLE_SERVICES_JSON file variable; local builds fall back to the local copy.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  android: {
    ...config.android,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
  },
});
