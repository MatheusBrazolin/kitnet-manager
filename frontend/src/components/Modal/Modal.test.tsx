import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from './Modal';

function renderModal(onClose = vi.fn()) {
  render(
    <Modal title="Novo pagamento" onClose={onClose}>
      <input aria-label="Valor" />
      <button type="button">Salvar</button>
    </Modal>,
  );
  return onClose;
}

describe('Modal', () => {
  it('se anuncia como diálogo, rotulado pelo próprio título', () => {
    renderModal();

    const dialogo = screen.getByRole('dialog');
    expect(dialogo).toHaveAttribute('aria-modal', 'true');
    expect(dialogo).toHaveAccessibleName('Novo pagamento');
  });

  // Sem isto, o único jeito de sair era achar o × com o mouse.
  it('fecha no ESC', async () => {
    const user = userEvent.setup();
    const onClose = renderModal();

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalled();
  });

  // No corpo, não no × do cabeçalho: em ordem de DOM o botão fechar vem antes, mas num
  // formulário o cursor deve começar no primeiro campo.
  it('move o foco para o primeiro campo do corpo ao abrir', () => {
    renderModal();
    expect(screen.getByLabelText('Valor')).toHaveFocus();
  });

  // Antes, o Tab continuava percorrendo a sidebar e a tabela por baixo do overlay, sem
  // nenhuma indicação visual de onde o foco estava.
  it('prende o Tab dentro do diálogo', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.tab(); // Valor -> Salvar (último focável em ordem de DOM)
    expect(screen.getByRole('button', { name: 'Salvar' })).toHaveFocus();
    await user.tab(); // volta pro primeiro do DOM (o ×) em vez de escapar pra página
    expect(screen.getByRole('button', { name: 'Fechar' })).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText('Valor')).toHaveFocus();
  });

  it('fecha ao clicar no overlay', async () => {
    const user = userEvent.setup();
    const onClose = renderModal();

    await user.click(screen.getByRole('dialog').parentElement!);

    expect(onClose).toHaveBeenCalled();
  });

  // Regressão: com onClick no overlay, começar a selecionar texto dentro do modal e
  // soltar o mouse fora fechava o formulário e perdia tudo que tinha sido digitado.
  it('não fecha quando o mouse é solto fora mas começou dentro', async () => {
    const user = userEvent.setup();
    const onClose = renderModal();

    const dialogo = screen.getByRole('dialog');
    await user.pointer([
      { target: dialogo, keys: '[MouseLeft>]' },
      { target: dialogo.parentElement! },
      { keys: '[/MouseLeft]' },
    ]);

    expect(onClose).not.toHaveBeenCalled();
  });
});
