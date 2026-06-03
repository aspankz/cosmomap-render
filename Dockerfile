# cosmomap-render Dockerfile — multi-stage, buildable from a clean git clone
#
# Build stage: full Node 22 image, compiles TypeScript → dist/
# Runtime stage: Ubuntu 24.04 + NodeSource Node 22 (glibc 2.38 / ICU 74 required
#   by the mbgl.node linux/amd64 prebuilt).
#
# Theme JSON note: tsconfig has resolveJsonModule:true + rootDir:src + outDir:dist,
# so tsc emits src/vendored/theme/data/themes.json → dist/vendored/theme/data/themes.json
# automatically. No extra COPY of theme JSON is needed in the runtime stage.

# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:22 AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# ── Runtime stage ─────────────────────────────────────────────────────────────
# KEEP ubuntu:24.04 — mbgl.node prebuilt (node-v127/v6.4.1) needs glibc 2.38 / ICU 74 /
# libjpeg.so.8. Do NOT use Debian bookworm or Alpine.
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

# Install Node 22 via NodeSource
RUN apt-get update && apt-get install -y ca-certificates curl gnupg2 --no-install-recommends \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
       | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" \
       > /etc/apt/sources.list.d/nodesource.list \
    && apt-get update && apt-get install -y nodejs --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Runtime libs required by mbgl.node (linux/amd64 prebuilt, node-v127):
# - libgl1 + libglx-mesa0 + libegl1 + libopengl0 + libgl1-mesa-dri: OpenGL / GLX
# - libjpeg-turbo8: mbgl uses libjpeg.so.8 (Ubuntu 24.04 name)
# - libicu74: ICU 74 (glibc 2.38 era)
# - libuv1t64: libuv (Ubuntu 24.04 renamed suffix)
# - libwebp7 + libpng16-16t64: image codecs
# - xvfb: virtual framebuffer (GLX backend needs an X display on Linux)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglx-mesa0 \
    libegl1 \
    libopengl0 \
    libgl1-mesa-dri \
    libjpeg-turbo8 \
    libicu74 \
    libuv1t64 \
    libwebp7 \
    libpng16-16t64 \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install production deps — fetches the linux/amd64 mbgl prebuilt for node-v127
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy compiled app (includes dist/vendored/theme/data/themes.json via resolveJsonModule)
COPY --from=build /app/dist ./dist

# Output dir for renders
RUN mkdir -p out

# Robust Xvfb entrypoint
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 3030

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["node", "dist/server.js"]
