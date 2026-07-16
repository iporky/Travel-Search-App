import { ImageSourcePropType, Platform } from 'react-native';

function toAndroidResourceName(baseName: string): string {
  return `assets_onboarding_${baseName.toLowerCase().replace(/[^a-z0-9_]/g, '')}`;
}

export function onboardingSource(
  localSource: ImageSourcePropType,
  baseName: string,
): ImageSourcePropType {
  // Keep local bundled asset source in all builds.
  // The android resource-uri fallback can break when resource names do not
  // exactly match generated drawables.
  return localSource;
}
