#!/usr/bin/env node
// Trava de regressão: garante que o serviço "backend" do vercel.json nunca deixe
// a Vercel rodar o script "build" do backend/package.json (nest build) antes da
// detecção zero-config de NestJS.
//
// Histórico: quando isso acontece, a Vercel termina o build sem gerar nenhuma
// "function" deployável, e toda rota da API quebra em produção com
// FUNCTION_INVOCATION_FAILED: "Cannot find module '@nestjs/common'" — mesmo com
// a dependência certinha no package.json. Já aconteceu várias vezes neste
// projeto (ver README.md, seção "Deploy (Vercel)"). Este script existe pra
// pegar isso em CI antes de chegar em produção de novo.

const fs = require('fs');
const path = require('path');

const vercelJsonPath = path.join(__dirname, '..', 'vercel.json');
const config = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'));

const backend = config.services && config.services.backend;
if (!backend) {
  console.error('❌ vercel.json não tem services.backend definido.');
  process.exit(1);
}

const buildCommand = (backend.buildCommand || '').trim();
// Só consideramos seguro um buildCommand explicitamente no-op (começa com "echo" /
// "true" / ":"). Qualquer outra coisa — vazio, ou um comando real — é tratado como
// risco de acabar invocando o "build" do package.json (nest build) direto ou indireto.
const isKnownNoop = /^(echo\b|true$|:\s*$)/.test(buildCommand);

if (!isKnownNoop) {
  console.error(
    '❌ services.backend.buildCommand em vercel.json está ausente ou parece rodar o "build" do package.json (nest build).\n' +
      '   Isso já causou "Cannot find module \'@nestjs/common\'" em produção (Vercel não gera função deployável).\n' +
      '   Mantenha um buildCommand no-op (ex.: um "echo ...") pra deixar a Vercel empacotar direto de src/main.ts.\n' +
      '   Veja README.md, seção "Deploy (Vercel)", antes de alterar isso.',
  );
  process.exit(1);
}

console.log('✅ vercel.json: services.backend.buildCommand está OK (não roda o build do projeto).');
