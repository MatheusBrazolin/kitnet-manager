import { useState } from 'react';

// Padrão "Set de ids expandidos/selecionados + toggle" repetido em Imoveis, Pagamentos e
// UnitPicker (cada um com sua própria cópia do mesmo `useState<Set<T>>` + função de toggle).
// Centralizado aqui pra não reimplementar pela quarta vez.
export function useToggleSet<T>() {
  const [set, setSet] = useState<Set<T>>(new Set());

  function toggle(id: T) {
    setSet((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) {
        proximo.delete(id);
      } else {
        proximo.add(id);
      }
      return proximo;
    });
  }

  return [set, toggle] as const;
}
