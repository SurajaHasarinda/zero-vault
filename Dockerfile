# Multi-stage build for single container deployment
FROM node:20-alpine AS frontend-builder

WORKDIR /app
COPY ui/package*.json ./
RUN npm ci
COPY ui ./
RUN npm run build

# Backend with built frontend
FROM python:3.11-slim

WORKDIR /app

# Install curl (additional tool)
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend
COPY app ./app

# Copy built frontend
COPY --from=frontend-builder /app/dist ./static

# Expose port
EXPOSE 8000

# Run application (backend serves frontend)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
