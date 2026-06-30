#!/bin/bash
set -e

echo "==> Instalando dependências do frontend..."
cd frontend
npm install
npm run build
cd ..

echo "==> Coletando arquivos estáticos do Django..."
python manage.py collectstatic --noinput

echo "==> Build completo!"
