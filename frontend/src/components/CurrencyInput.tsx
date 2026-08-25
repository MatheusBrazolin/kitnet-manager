import type { ChangeEvent } from 'react';
import { formatCurrency } from '../utils/currency';

interface CurrencyInputProps {
  id?: string;
  ariaLabel?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
}

function centsFromReais(value: string): number {
  const n = Number(value);
  return !value || Number.isNaN(n) ? 0 : Math.round(n * 100);
}

/**
 * Campo de valor em reais com máscara "de trás pra frente": você digita os dígitos e eles
 * preenchem a partir dos centavos (ex.: 1-4-0-0-0-0 vira R$ 1.400,00) — o mesmo padrão de
 * apps de banco/pagamento. Fica sempre controlado por `value` (string numérica em reais,
 * ex. "1400.5", igual ao que os formulários já usavam antes), então o resto do código
 * continua fazendo `Number(valor)` normalmente pra montar o payload da API — só a exibição
 * enquanto o usuário digita que ganha o "R$" e o separador de milhar.
 */
export function CurrencyInput({ id, ariaLabel, value, onChange, required, placeholder }: CurrencyInputProps) {
  const display = value === '' ? '' : formatCurrency(centsFromReais(value) / 100);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const digitsOnly = event.target.value.replace(/\D/g, '');
    if (digitsOnly === '') {
      onChange('');
      return;
    }
    const cents = parseInt(digitsOnly, 10);
    onChange((cents / 100).toString());
  }

  return (
    <input
      id={id}
      aria-label={ariaLabel}
      type="text"
      inputMode="decimal"
      required={required}
      placeholder={placeholder}
      value={display}
      onChange={handleChange}
    />
  );
}
