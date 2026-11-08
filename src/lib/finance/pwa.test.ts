import { describe, expect, it } from 'vitest';
import { detectInstallPlatform } from './pwa';

describe('Foco installation guide platform detection', () => {
  it('recognizes iPhone regardless of browser', () => {
    expect(detectInstallPlatform('Mozilla/5.0 (iPhone) Safari/605')).toBe('ios');
    expect(detectInstallPlatform('Mozilla/5.0 (iPhone) CriOS/130')).toBe('ios');
  });
  it('recognizes iPadOS desktop-mode user agent', () => {
    expect(detectInstallPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X)', 5)).toBe('ios');
  });
  it('recognizes Android and desktop', () => {
    expect(detectInstallPlatform('Mozilla/5.0 (Linux; Android 15; Pixel) Chrome/130')).toBe('android');
    expect(detectInstallPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X)', 0)).toBe('desktop');
  });
});
