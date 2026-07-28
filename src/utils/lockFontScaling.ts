import { Text, TextInput } from 'react-native';

/**
 * Freeze all text at its designed size — ignore the phone's font-size / bold /
 * display accessibility settings so the layout never breaks.
 *
 * Why the usual tricks don't work here:
 *  • React 19 dropped `defaultProps` for function components, so
 *    `Text.defaultProps.allowFontScaling = false` is a no-op.
 *  • RN 0.81's Text/TextInput are plain function components (React 19 style,
 *    `ref` as a prop) with no `forwardRef.render` to patch.
 *
 * So we patch the JSX runtime itself: every `<Text>` / `<TextInput>` element is
 * created through `jsx`/`jsxs` (`react/jsx-runtime`). When one is created
 * without an explicit `allowFontScaling`, we inject `allowFontScaling: false`
 * (+ `maxFontSizeMultiplier: 1`). An element can still opt in by passing its own
 * `allowFontScaling`. This must run before any screen renders.
 */
const FROZEN = new Set<unknown>([Text, TextInput]);

function freeze(props: any): any {
  if (!props || props.allowFontScaling !== undefined) return props;
  return {
    ...props,
    allowFontScaling: false,
    maxFontSizeMultiplier: props.maxFontSizeMultiplier ?? 1,
  };
}

function patchRuntime(mod: any, keys: string[]): void {
  if (!mod) return;
  for (const key of keys) {
    const orig = mod[key];
    if (typeof orig !== 'function' || orig.__fontFrozen) continue;
    const patched = (type: any, props: any, ...rest: any[]) =>
      orig(type, FROZEN.has(type) ? freeze(props) : props, ...rest);
    patched.__fontFrozen = true;
    try {
      mod[key] = patched;
    } catch {
      /* read-only export — ignore */
    }
  }
}

// Static requires so Metro can resolve them.
patchRuntime(require('react/jsx-runtime'), ['jsx', 'jsxs']);
try {
  patchRuntime(require('react/jsx-dev-runtime'), ['jsxDEV']);
} catch {
  /* dev runtime not present in release — fine */
}
