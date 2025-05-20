# Use the official Node.js image as base
FROM node:16-slim

# Install dependencies needed for Puppeteer/Chrome
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    procps \
    libxss1 \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    unzip \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set up working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application files
COPY . .

# Install AdsPower Global CLI
RUN mkdir -p /usr/local/adspower
WORKDIR /usr/local/adspower

# Download AdsPower CLI
# Note: You would need to replace this URL with the actual download URL for the Linux version
RUN curl -L -o adspower.zip "https://download.adspower.net/runner/adspower-linux.zip" && \
    unzip adspower.zip && \
    chmod +x adspower_global

# Add AdsPower to PATH
ENV PATH="/usr/local/adspower:${PATH}"

# Setup environment variables
ENV NODE_ENV=production
ENV ADSPOWER_HEADLESS=true
ENV PORT=8080

# Return to app directory
WORKDIR /app

# Expose the application port
EXPOSE 8080

# Start the application
CMD ["node", "cloud-run/server.js"]