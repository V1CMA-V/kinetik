import { resetPasswordSchema, resetRequestSchema, signInSchema } from '@/features/auth/schemas';
import { changePasswordSchema, displayNameSchema } from '@/features/profile/schemas';

const issuePaths = (result: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) =>
  result.success ? [] : (result.error?.issues ?? []).map((issue) => issue.path.join('.'));

describe('signInSchema', () => {
  it('accepts an email and password', () => {
    expect(signInSchema.safeParse({ email: 'ana@example.com', password: '123456' }).success).toBe(
      true,
    );
  });

  it('rejects a bad email or short password', () => {
    expect(issuePaths(signInSchema.safeParse({ email: 'ana', password: '12345' }))).toEqual([
      'email',
      'password',
    ]);
  });
});

describe('resetRequestSchema', () => {
  it('requires a valid email', () => {
    expect(resetRequestSchema.safeParse({ email: 'ana@example' }).success).toBe(false);
  });
});

describe('resetPasswordSchema', () => {
  const valid = { code: ' 123456 ', password: 'nueva-clave', confirm: 'nueva-clave' };

  it('accepts a 6-8 digit code and trims it', () => {
    expect(resetPasswordSchema.parse(valid).code).toBe('123456');
    expect(resetPasswordSchema.safeParse({ ...valid, code: '12345678' }).success).toBe(true);
  });

  it.each(['12345', '123456789', '12a456'])('rejects the code %p', (code) => {
    expect(issuePaths(resetPasswordSchema.safeParse({ ...valid, code }))).toEqual(['code']);
  });

  it('requires a long password that matches the confirmation', () => {
    expect(
      issuePaths(resetPasswordSchema.safeParse({ ...valid, password: 'corta', confirm: 'corta' })),
    ).toEqual(['password']);
    expect(issuePaths(resetPasswordSchema.safeParse({ ...valid, confirm: 'otra-clave' }))).toEqual([
      'confirm',
    ]);
  });
});

describe('changePasswordSchema', () => {
  const valid = { current: 'actual-123', next: 'nueva-123', confirm: 'nueva-123' };

  it('accepts a new matching password', () => {
    expect(changePasswordSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects reusing the current password', () => {
    expect(
      issuePaths(
        changePasswordSchema.safeParse({ ...valid, next: valid.current, confirm: valid.current }),
      ),
    ).toEqual(['next']);
  });

  it('rejects a confirmation that does not match', () => {
    expect(issuePaths(changePasswordSchema.safeParse({ ...valid, confirm: 'otra' }))).toEqual([
      'confirm',
    ]);
  });
});

describe('displayNameSchema', () => {
  it('trims and allows clearing the name', () => {
    expect(displayNameSchema.parse('  Ana  ')).toBe('Ana');
    expect(displayNameSchema.parse('   ')).toBe('');
  });

  it('rejects names over 40 characters', () => {
    expect(displayNameSchema.safeParse('x'.repeat(41)).success).toBe(false);
  });
});
