import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CurrencyInput } from './CurrencyInput';

// CurrencyInput é totalmente controlado pelo `value` que recebe — pra testar a digitação de
// verdade (não só um único onChange isolado), precisamos de um wrapper que re-renderiza o
// componente com o valor atualizado a cada tecla, exatamente como as telas reais fazem.
function ControlledCurrencyInput({ initialValue = '' }: { initialValue?: string }) {
  const [value, setValue] = useState(initialValue);
  return <CurrencyInput id="valor" value={value} onChange={setValue} />;
}

describe('CurrencyInput', () => {
  it('shows an empty field when the value is an empty string', () => {
    render(<ControlledCurrencyInput />);
    expect(screen.getByRole('textbox')).toHaveValue('');
  });

  it('formats digits typed as BRL currency, filling from the cents up', async () => {
    const user = userEvent.setup();
    render(<ControlledCurrencyInput />);
    const input = screen.getByRole('textbox');

    await user.type(input, '150000');

    expect(input).toHaveValue('R$ 1.500,00');
  });

  it('formats a single-digit value as cents', async () => {
    const user = userEvent.setup();
    render(<ControlledCurrencyInput />);
    const input = screen.getByRole('textbox');

    await user.type(input, '5');

    expect(input).toHaveValue('R$ 0,05');
  });

  it('pre-fills correctly from an existing numeric value, including decimals', () => {
    render(<ControlledCurrencyInput initialValue="168.45" />);
    expect(screen.getByRole('textbox')).toHaveValue('R$ 168,45');
  });

  it('pre-fills correctly from an existing whole-number value', () => {
    render(<ControlledCurrencyInput initialValue="1400" />);
    expect(screen.getByRole('textbox')).toHaveValue('R$ 1.400,00');
  });

  it('clears back to empty when every digit is deleted', async () => {
    const user = userEvent.setup();
    render(<ControlledCurrencyInput initialValue="1400" />);
    const input = screen.getByRole('textbox');

    await user.clear(input);

    expect(input).toHaveValue('');
  });
});
