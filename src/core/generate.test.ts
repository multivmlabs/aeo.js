import { describe, it, expect } from 'vitest';
import { generateAEOFiles } from './generate';

describe('generate re-export', () => {
  it('should export generateAEOFiles', () => {
    expect(typeof generateAEOFiles).toBe('function');
  });
});
