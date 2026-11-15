import { expect, it } from 'bun:test';
it('fails on purpose to prove the CI gate', () => {
  expect(1).toBe(2);
});
var   unused_var_for_lint = 1
