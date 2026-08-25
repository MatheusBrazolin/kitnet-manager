import { useEffect, useMemo, useRef, useState } from 'react';
import type { Kitnet } from '../../types';
import { useToggleSet } from '../../hooks/useToggleSet';
import './unit-picker.css';

interface UnitPickerProps {
  id?: string;
  kitnets: Kitnet[];
  value: number | null;
  onChange: (kitnetId: number) => void;
  placeholder?: string;
}

interface Grupo {
  imovelId: number;
  nome: string;
  unidades: Kitnet[];
}

function agruparPorImovel(kitnets: Kitnet[]): Grupo[] {
  const grupos = new Map<number, Grupo>();
  for (const kitnet of kitnets) {
    const imovelId = kitnet.imovel?.id ?? kitnet.imovelId;
    const nome = kitnet.imovel?.nome ?? `Imóvel ${imovelId}`;
    const existente = grupos.get(imovelId);
    if (existente) {
      existente.unidades.push(kitnet);
    } else {
      grupos.set(imovelId, { imovelId, nome, unidades: [kitnet] });
    }
  }
  return Array.from(grupos.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

export function UnitPicker({ id, kitnets, value, onChange, placeholder = 'Selecione' }: UnitPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandidos, toggleExpandido] = useToggleSet<number>();
  const containerRef = useRef<HTMLDivElement>(null);

  const grupos = useMemo(() => agruparPorImovel(kitnets), [kitnets]);
  const selecionado = kitnets.find((kitnet) => kitnet.id === value) ?? null;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function selecionar(kitnetId: number) {
    onChange(kitnetId);
    setIsOpen(false);
  }

  const rotulo = selecionado
    ? selecionado.imovel && (kitnets.filter((k) => (k.imovel?.id ?? k.imovelId) === (selecionado.imovel?.id ?? selecionado.imovelId)).length > 1)
      ? `${selecionado.imovel.nome} · ${selecionado.numero}`
      : selecionado.imovel?.nome ?? selecionado.numero
    : placeholder;

  return (
    <div className="unit-picker" ref={containerRef}>
      <button
        type="button"
        id={id}
        className="unit-picker-trigger"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={selecionado ? '' : 'unit-picker-placeholder'}>{rotulo}</span>
        <span className="unit-picker-chevron" aria-hidden="true">
          ▾
        </span>
      </button>

      {isOpen && (
        <div className="unit-picker-panel" role="listbox">
          {grupos.length === 0 && <p className="unit-picker-empty">Nenhuma unidade disponível.</p>}

          {grupos.map((grupo) =>
            grupo.unidades.length === 1 ? (
              <button
                key={grupo.imovelId}
                type="button"
                role="option"
                aria-selected={grupo.unidades[0].id === value}
                className={`unit-picker-item unit-picker-item-single${
                  grupo.unidades[0].id === value ? ' unit-picker-item-active' : ''
                }`}
                onClick={() => selecionar(grupo.unidades[0].id)}
              >
                {grupo.unidades[0].id === value && <span className="unit-picker-check">✓</span>}
                {grupo.nome}
              </button>
            ) : (
              <div key={grupo.imovelId} className="unit-picker-group">
                <button
                  type="button"
                  className="unit-picker-group-header"
                  onClick={() => toggleExpandido(grupo.imovelId)}
                  aria-expanded={expandidos.has(grupo.imovelId)}
                >
                  <span>
                    {grupo.nome} <span className="unit-picker-group-count">({grupo.unidades.length})</span>
                  </span>
                  <span className={`unit-picker-chevron${expandidos.has(grupo.imovelId) ? ' unit-picker-chevron-open' : ''}`}>
                    ▾
                  </span>
                </button>

                {expandidos.has(grupo.imovelId) && (
                  <div className="unit-picker-group-items">
                    {grupo.unidades.map((unidade) => (
                      <button
                        key={unidade.id}
                        type="button"
                        role="option"
                        aria-selected={unidade.id === value}
                        className={`unit-picker-item${unidade.id === value ? ' unit-picker-item-active' : ''}`}
                        onClick={() => selecionar(unidade.id)}
                      >
                        {unidade.id === value && <span className="unit-picker-check">✓</span>}
                        {unidade.numero}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}
