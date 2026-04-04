FROM node:22-slim

# Install git for in-container operations (e.g. plugin resolution) and to keep
# the tool available when the source directory is bind-mounted for development
RUN apt-get update \
    && apt-get install -y --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/*

# Install the Todoist CLI (td) and OpenClaw globally
# td is required by the plugin at runtime; openclaw is the host application
RUN npm install -g @doist/todoist-cli openclaw

WORKDIR /app

# Copy dependency manifests first to exploit Docker layer caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the source and build the TypeScript plugin
COPY . .
RUN npm run build

# Register this plugin with the global OpenClaw installation
RUN openclaw plugins install -l .

ENTRYPOINT ["openclaw"]
