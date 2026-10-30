import { useId, type ChangeEvent } from 'react';
import {
  DDDS_VALIDOS,
  dddDigitado,
  erroDoTelefone,
  formatTelefone,
} from '../utils/telefone';

interface TelefoneInputProps {
  id?: string;
  ariaLabel?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
}

/**
 * Campo de telefone que se formata sozinho enquanto a pessoa digita.
 *
 * Digitar 11989000155 direto vira "(11) 98900-0155" — antes, o campo era um `input`
 * cru e o número entrava como viesse, então a mesma lista exibia "11989000155" numa
 * linha e "(11) 98900-0155" na outra.
 *
 * Guarda o valor já formatado (e não só os dígitos) porque é assim que o banco sempre
 * gravou: trocar para dígitos puros exigiria migrar o que já está lá, e formatar na
 * exibição resolve o histórico sem tocar em nada.
 *
 * O DDD é conferido contra os 67 códigos que existem no Brasil, mas o erro é um aviso
 * ao lado do campo, não um bloqueio: o `required` do formulário já impede salvar vazio,
 * e travar o envio por causa de um número estrangeiro ou de um ramal fora do padrão
 * seria pior que aceitá-lo.
 */
export function TelefoneInput({
  id,
  ariaLabel,
  value,
  onChange,
  required,
  placeholder = '(11) 98900-0155',
}: TelefoneInputProps) {
  const erroId = useId();
  const erro = erroDoTelefone(value);
  const ddd = dddDigitado(value);
  const dddInexistente = ddd !== null && !DDDS_VALIDOS.has(ddd);
  // DDD errado aparece já no segundo dígito, porque dígito nenhum depois dele conserta.
  // "Faltam dígitos", não: avisar isso no meio da digitação é implicância.
  const mostrarErro =
    erro !== null &&
    (dddInexistente || value.replace(/\D/g, '').length >= 10);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(formatTelefone(event.target.value));
  }

  return (
    <>
      <input
        id={id}
        aria-label={ariaLabel}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        aria-invalid={mostrarErro || undefined}
        aria-describedby={mostrarErro ? erroId : undefined}
      />
      {mostrarErro && (
        <p id={erroId} className="field-erro" role="alert">
          {erro}
        </p>
      )}
    </>
  );
}
