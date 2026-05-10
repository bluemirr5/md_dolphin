import { describe, it, expect } from 'vitest';
import { isMacOS } from '@shared/platform';

describe('platform helper', () => {
  it('isMacOS returns boolean', () => {
    expect(typeof isMacOS()).toBe('boolean');
  });
});
