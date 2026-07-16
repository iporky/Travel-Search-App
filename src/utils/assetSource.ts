import { Image, ImageSourcePropType } from 'react-native';

const sourceCache = new Map<number, ImageSourcePropType>();

export function toAssetUriSource(source: ImageSourcePropType): ImageSourcePropType {
  if (typeof source !== 'number') return source;

  const cached = sourceCache.get(source);
  if (cached) return cached;

  const resolved = Image.resolveAssetSource(source as number);
  const uri = resolved?.uri;

  if (!uri) return source;

  const normalized: ImageSourcePropType = { uri };
  sourceCache.set(source, normalized);
  return normalized;
}
