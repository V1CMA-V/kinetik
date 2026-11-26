import type { Account } from '@/features/accounts/api';
import {
  type AccountFormInput,
  accountSchema,
  accountToFormValues,
} from '@/features/accounts/schemas';

const card = (overrides: Partial<AccountFormInput> = {}): AccountFormInput => ({
  name: ' Oro ',
  type: 'credit_card',
  institution: 'Banorte',
  balance: '3,500.00',
  creditLimit: '50,000',
  statementDay: '15',
  paymentDueDay: '5',
  shared: undefined,
  ...overrides,
});

const errorPaths = (input: AccountFormInput) => {
  const result = accountSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
};

describe('accountSchema', () => {
  it('stores credit card debt as a negative balance with its cycle', () => {
    expect(accountSchema.parse(card())).toEqual({
      name: 'Oro',
      type: 'credit_card',
      institution: 'Banorte',
      balance: -3500,
      credit_limit: 50000,
      statement_day: 15,
      payment_due_day: 5,
      shared: false,
    });
  });

  it('keeps a card without cycle days', () => {
    expect(accountSchema.parse(card({ statementDay: '', paymentDueDay: '' }))).toMatchObject({
      statement_day: null,
      payment_due_day: null,
    });
  });

  it('drops card-only fields and the bank from cash', () => {
    expect(
      accountSchema.parse(card({ type: 'cash', balance: '-20', shared: true, creditLimit: '' })),
    ).toEqual({
      name: 'Oro',
      type: 'cash',
      institution: null,
      balance: -20,
      credit_limit: null,
      statement_day: null,
      payment_due_day: null,
      shared: true,
    });
  });

  it('stores an empty bank as null', () => {
    expect(accountSchema.parse(card({ type: 'bank_account', institution: '' })).institution).toBe(
      null,
    );
  });

  it.each([
    [{ name: '  ' }, 'name'],
    [{ name: 'x'.repeat(61) }, 'name'],
    [{ balance: '12.345' }, 'balance'],
    [{ balance: 'abc' }, 'balance'],
    [{ creditLimit: '' }, 'creditLimit'],
    [{ creditLimit: '-100' }, 'creditLimit'],
    [{ statementDay: '0' }, 'statementDay'],
    [{ paymentDueDay: '32' }, 'paymentDueDay'],
  ])('rejects %p', (overrides, path) => {
    expect(errorPaths(card(overrides))).toEqual([path]);
  });

  it('asks for both cycle days when only one is given', () => {
    expect(errorPaths(card({ statementDay: '15', paymentDueDay: '' }))).toEqual(['paymentDueDay']);
    expect(errorPaths(card({ statementDay: '', paymentDueDay: '5' }))).toEqual(['statementDay']);
  });

  it('does not ask for a credit limit outside cards', () => {
    expect(errorPaths(card({ type: 'bank_account', creditLimit: '' }))).toEqual([]);
  });
});

describe('accountToFormValues', () => {
  const stored = {
    name: 'Oro',
    type: 'credit_card',
    institution: 'Banorte',
    balance: -3500,
    credit_limit: 50000,
    statement_day: 15,
    payment_due_day: 5,
    household_id: 'h1',
  } as Account;

  it('shows card debt as a positive amount', () => {
    expect(accountToFormValues(stored)).toEqual({
      name: 'Oro',
      type: 'credit_card',
      institution: 'Banorte',
      balance: '3500.00',
      creditLimit: '50000.00',
      statementDay: '15',
      paymentDueDay: '5',
      shared: true,
    });
  });

  it('round-trips through the schema', () => {
    expect(accountSchema.parse(accountToFormValues(stored))).toMatchObject({
      balance: -3500,
      credit_limit: 50000,
      statement_day: 15,
      payment_due_day: 5,
      shared: true,
    });
  });

  it('fills empty fields for an account without card data', () => {
    expect(
      accountToFormValues({
        ...stored,
        type: 'cash',
        institution: null,
        balance: 200,
        credit_limit: null,
        statement_day: null,
        payment_due_day: null,
        household_id: null,
      }),
    ).toMatchObject({
      institution: '',
      balance: '200.00',
      creditLimit: '',
      statementDay: '',
      paymentDueDay: '',
      shared: false,
    });
  });
});
