import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

const PANEL_MAX_HEIGHT = 320;

export function UnitPicker({ id, kitnets, value, onChange, placeholder = 'Selecione' }: UnitPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandidos, toggleExpandido] = useToggleSet<number>();
  const containerRef = useRef<HTMLDivElement>(null);
  const painelRef = useRef<HTMLDivElement>(null);
  const [posicao, setPosicao] = useState<{ top: number; left: number; width: number } | null>(null);

  const grupos = useMemo(() => agruparPorImovel(kitnets), [kitnets]);
  const selecionado = kitnets.find((kitnet) => kitnet.id === value) ?? null;

  // O painel é renderizado em portal no <body>, não dentro do componente. Como
  // `.modal-body` tem `overflow-y: auto`, um filho `position: absolute` era recortado na
  // borda do modal — abrir o seletor na metade de baixo de um formulário mostrava a
  // lista cortada, e z-index não resolve recorte.
  const reposicionar = useCallback(() => {
    const gatilho = containerRef.current;
    if (!gatilho) {
      return;
    }
    const rect = gatilho.getBoundingClientRect();
    const espacoAbaixo = window.innerHeight - rect.bottom;
    // Sem espaço abaixo, abre para cima em vez de vazar pra fora da tela.
    const abrirParaCima = espacoAbaixo < PANEL_MAX_HEIGHT && rect.top > espacoAbaixo;
    const altura = painelRef.current?.offsetHeight ?? PANEL_MAX_HEIGHT;
    setPosicao({
      top: abrirParaCima ? rect.top - altura - 4 : rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) {
      setPosicao(null);
      return;
    }
    reposicionar();
    // `true` na captura: pega também o scroll do .modal-body, que não borbulha.
    window.addEventListener('scroll', reposicionar, true);
    window.addEventListener('resize', reposicionar);
    return () => {
      window.removeEventListener('scroll', reposicionar, true);
      window.removeEventListener('resize', reposicionar);
    };
  }, [isOpen, expandidos, reposicionar]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const alvo = event.target as Node;
      const dentroDoGatilho = containerRef.current?.contains(alvo);
      // O painel vive fora da árvore do componente (portal), então precisa ser checado
      // à parte — senão clicar numa opção fecharia antes do onClick disparar.
      const dentroDoPainel = painelRef.current?.contains(alvo);
      if (!dentroDoGatilho && !dentroDoPainel) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    function onEsc(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        // Para no seletor: sem isso o ESC fecharia o modal inteiro junto.
        event.stopPropagation();
        setIsOpen(false);
      }
    }
    document.addEventListener('keydown', onEsc, true);
    return () => document.removeEventListener('keydown', onEsc, true);
  }, [isOpen]);

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

      {isOpen &&
        createPortal(
          <div
            ref={painelRef}
            className="unit-picker-panel"
            role="listbox"
            style={
              posicao
                ? { top: posicao.top, left: posicao.left, width: posicao.width }
                : { visibility: 'hidden' }
            }
          >
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
          </div>,
          document.body,
        )}
    </div>
  );
}
