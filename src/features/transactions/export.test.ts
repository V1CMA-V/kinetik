import {
  type ExportableTransaction,
  csvCell,
  exportFileName,
  signedAmount,
  transactionsToCsv,
} from '@/features/transactions/export';

const expense: ExportableTransaction = {
  occurred_on: '2026-11-20',
  kind: 'expense',
  amount: 1250.5,
  description: 'Cena, con "amigos"',
  category: 'Comida',
  installment_months: null,
  account: { name: 'Oro', institution: 'Banorte' },
  to_account: null,
};

describe('csvCell', () => {
  it('leaves plain text alone', () => {
    expect(csvCell('Súper')).toBe('Súper');
  });

  it('quotes commas, quotes and line breaks', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('di "hola"')).toBe('"di ""hola"""');
    expect(csvCell('línea\nnueva')).toBe('"línea\nnueva"');
  });

  it('neutralizes formulas', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('+52 55')).toBe("'+52 55");
    expect(csvCell('-10')).toBe("'-10");
    expect(csvCell('@user')).toBe("'@user");
  });
});

describe('signedAmount', () => {
  it('makes expenses negative only', () => {
    expect(signedAmount({ kind: 'expense', amount: 10 })).toBe(-10);
    expect(signedAmount({ kind: 'income', amount: 10 })).toBe(10);
    expect(signedAmount({ kind: 'transfer', amount: 10 })).toBe(10);
  });
});

describe('transactionsToCsv', () => {
  it('writes a BOM, headers and one CRLF line per movement', () => {
    const csv = transactionsToCsv([
      expense,
      {
        occurred_on: '2026-11-21',
        kind: 'transfer',
        amount: 3000,
        description: null,
        category: null,
        installment_months: null,
        account: null,
        to_account: { name: 'Compartida', institution: null },
      },
      { ...expense, description: 'Pantalla', category: 'Compras', installment_months: 12 },
    ]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv.slice(1).split('\r\n')).toEqual([
      'Fecha,Tipo,Descripción,Categoría,Cuenta,Cuenta destino,Monto,Meses sin intereses',
      '2026-11-20,Gasto,"Cena, con ""amigos""",Comida,Banorte · Oro,,-1250.50,',
      '2026-11-21,Transferencia,,,Cuenta de tu pareja,Compartida,3000.00,',
      '2026-11-20,Gasto,Pantalla,Compras,Banorte · Oro,,-1250.50,12',
      '',
    ]);
  });

  it('writes only the headers when there is nothing to export', () => {
    expect(transactionsToCsv([]).split('\r\n')).toHaveLength(2);
  });
});

describe('exportFileName', () => {
  it('names the file after the period', () => {
    expect(exportFileName('2026-11')).toBe('kinetik-movimientos-2026-11.csv');
  });
});
