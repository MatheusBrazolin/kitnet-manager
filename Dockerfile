FROM python:3.11-slim

# Instala Node.js
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Instala dependências Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Compila o frontend React
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Copia o restante do projeto
COPY . .

# Coleta estáticos do Django
RUN python manage.py collectstatic --noinput

EXPOSE 8000

CMD gunicorn kitnet_manager.wsgi --bind 0.0.0.0:$PORT --log-file -
