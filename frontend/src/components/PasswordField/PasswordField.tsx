import { useState } from 'react';
import './password-field.css';

interface PasswordFieldProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minLength?: number;
  pattern?: string;
  title?: string;
  autoComplete?: string;
}

export function PasswordField({
  id = 'password',
  label = 'Senha',
  value,
  onChange,
  placeholder,
  minLength,
  pattern,
  title,
  autoComplete,
}: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="password-field">
        <input
          id={id}
          type={isVisible ? 'text' : 'password'}
          required
          minLength={minLength}
          pattern={pattern}
          title={title}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setIsVisible((visible) => !visible)}
          aria-label={isVisible ? 'Ocultar senha' : 'Mostrar senha'}
          aria-pressed={isVisible}
        >
          {isVisible ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>
    </div>
  );
}
