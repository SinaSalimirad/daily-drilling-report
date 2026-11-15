import { describe, expect, it } from 'bun:test';
import { pitCreateSchema, projectCreateSchema } from '@ddr/schemas';
import { issuesToFieldErrors } from './form-errors';

describe('issuesToFieldErrors', () => {
  it('reads "Required" for a missing number and an empty required text', () => {
    const pit = pitCreateSchema.safeParse({ name: '' });
    expect(pit.success).toBe(false);
    if (!pit.success) {
      expect(issuesToFieldErrors(pit.error.issues)).toEqual({
        name: 'Required',
        capacity: 'Required',
      });
    }
  });

  it('keeps other messages and nested paths', () => {
    const project = projectCreateSchema.safeParse({
      name: 'A',
      operator: 'B',
      currency: '$',
      unitSystem: { density: 'bbl' },
    });
    expect(project.success).toBe(false);
    if (!project.success) {
      const errors = issuesToFieldErrors(project.error.issues);
      expect(errors['unitSystem.density']).toContain('Invalid option');
    }
  });
});
