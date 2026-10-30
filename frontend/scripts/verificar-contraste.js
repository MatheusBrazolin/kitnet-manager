#!/usr/bin/env node
/**
 * Trava de contraste dos botões de cor tingida.
 *
 * "Marcar pago" e "Não vou receber" são texto colorido sobre um fundo da mesma cor
 * — o arranjo em que contraste insuficiente é mais fácil de produzir sem reparar.
 * Na primeira versão desses botões o tom do "Não vou receber" ficou em 4.49:1, um
 * centésimo abaixo do mínimo da WCAG AA, e só apareceu porque foi medido.
 *
 * É script e não teste de vitest por um motivo prático: o vitest anula imports de
 * CSS nos testes, e as saídas para contornar isso custam caro — `css: true` global
 * quebra cinco testes que contam com o stub, e ler o arquivo com `fs` exigiria
 * @types/node só para isto. O projeto já tem o padrão de verificação estática em
 * script (ver scripts/verify-vercel-config.js na raiz), então este entra junto.
 *
 * Lê os valores do próprio tokens.css em vez de repeti-los aqui: duplicar o
 * hexadecimal faria a verificação passar enquanto a tela regride.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));

const MINIMO_AA = 4.5;

/** Pares (tinta, fundo) que precisam se sustentar nos dois temas. */
const PARES = [
  ['Marcar pago', '--color-positive', '--color-positive-soft'],
  ['Não vou receber', '--color-recusa', '--color-recusa-soft'],
];

const css = readFileSync(join(AQUI, '..', 'src', 'styles', 'tokens.css'), 'utf8');

function tokensDoTema(tema) {
  const abertura = tema === 'claro' ? ':root {' : ":root[data-theme='dark'] {";
  const inicio = css.indexOf(abertura);
  if (inicio === -1) {
    console.error(`❌ Não achei o bloco "${abertura}" em tokens.css.`);
    process.exit(1);
  }
  const bloco = css.slice(inicio, css.indexOf('\n}', inicio));
  const tokens = {};
  for (const m of bloco.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{6,8})\s*;/g)) {
    tokens[m[1]] = m[2];
  }
  return tokens;
}

function canais(hex) {
  const n = hex.slice(1);
  const v = (i) => parseInt(n.slice(i * 2, i * 2 + 2), 16);
  // Oitavo dígito é o alfa; sem ele, opaco.
  return [v(0), v(1), v(2), n.length === 8 ? v(3) / 255 : 1];
}

/** Compõe uma cor com alfa sobre um fundo opaco — é o que o navegador pinta. */
function sobre(corComAlfa, fundo) {
  const [r, g, b, a] = canais(corComAlfa);
  const [fr, fg, fb] = canais(fundo);
  const m = (c, f) => Math.round(c * a + f * (1 - a));
  return `#${[m(r, fr), m(g, fg), m(b, fb)]
    .map((c) => c.toString(16).padStart(2, '0'))
    .join('')}`;
}

function luminancia(hex) {
  const [r, g, b] = canais(hex);
  const lin = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

function contraste(frente, fundo) {
  const [a, b] = [luminancia(frente), luminancia(fundo)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}

let reprovados = 0;

for (const tema of ['claro', 'escuro']) {
  const tokens = tokensDoTema(tema);
  for (const [rotulo, tinta, fundo] of PARES) {
    if (!tokens[tinta] || !tokens[fundo]) {
      console.error(`❌ tema ${tema}: faltam os tokens ${tinta} / ${fundo}.`);
      reprovados += 1;
      continue;
    }
    // No tema escuro os tons suaves têm alfa e são pintados sobre a superfície do
    // cartão; medir contra o hexadecimal cru daria um número que ninguém vê.
    const fundoReal = sobre(tokens[fundo], tokens['--color-surface']);
    const razao = contraste(tokens[tinta], fundoReal);
    const ok = razao >= MINIMO_AA;
    if (!ok) {
      reprovados += 1;
    }
    console.log(
      `${ok ? '✅' : '❌'} tema ${tema.padEnd(6)} ${rotulo.padEnd(16)} ${razao.toFixed(2)}:1` +
        (ok ? '' : `  (mínimo ${MINIMO_AA}:1)`),
    );
  }
}

if (reprovados > 0) {
  console.error(
    `\n${reprovados} par(es) abaixo do mínimo da WCAG AA. Escureça a tinta ou clareie o fundo em src/styles/tokens.css.`,
  );
  process.exit(1);
}
