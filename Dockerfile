# Multi-Engine Chess API - Docker Configuration for Render
FROM python:3.11-slim

# Install system dependencies including Stockfish
RUN apt-get update && apt-get install -y \
    stockfish \
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Verify Stockfish installation
RUN which stockfish && stockfish --version

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user for security
RUN useradd -m -u 1000 chess && chown -R chess:chess /app
USER chess

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start the application
CMD ["python", "main.py"]
