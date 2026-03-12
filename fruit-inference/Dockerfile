# ─── Etapa base: Python slim con dependencias del sistema ──────────────────────
FROM python:3.11-slim

WORKDIR /app

# Dependencias del sistema necesarias para OpenCV (usado por ultralytics)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*

# Instala dependencias Python primero (capa cacheable)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia el código fuente
COPY . .

# Puerto por defecto de uvicorn
EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
