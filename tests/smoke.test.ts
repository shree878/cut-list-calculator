// Smoke test – verifies the test runner itself works.
// Real algorithm tests added in P1-T01.
import { describe, it, expect } from 'vitest';

describe('smoke', () => {
  it('passes', () => {
    expect(1 + 1).toBe(2);
  });
});
