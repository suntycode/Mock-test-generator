# Node.js 20 on Debian Bookworm (required for canvas / pdf-to-img native glibc support)
FROM node:20-bookworm-slim

# Install runtime dependencies for canvas & font rendering
RUN apt-get update && apt-get install -y --no-install-recommends \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libjpeg62-turbo \
    libgif7 \
    librsvg2-2 \
    fonts-deva \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm install

# Copy application source
COPY src ./src
COPY .env.example ./
RUN cp .env.example .env

# Create directory for storage
RUN mkdir -p /storage

EXPOSE 5000

ENV PORT=5000
ENV STORAGE_DIR=/storage

CMD ["node", "src/index.js"]

