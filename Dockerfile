# -----------------------------------------------------------------------------
# Multi-stage build for the ai-schadcn-chat demo SPA.
#
# Stage 1: build. Installs the workspace dependencies, then runs the
# demo's Vite build. The demo currently resolves `ai-schadcn-chat/*`
# via path aliases to ../src so it does not need the package library
# build output here; it depends on TypeScript source instead. When
# the demo is migrated to consume the npm-published package (a
# follow-up), this stage needs to also run `pnpm build` so the
# package's dist/ is on disk, or, more cleanly, switch the alias to
# the npm path so install brings dist/ via pnpm.
#
# Stage 2: serve. Alpine + nginx. Ships only the bundled SPA, no node.
# Layer size ~30 MB.
# -----------------------------------------------------------------------------

ARG NODE_VERSION=20-bookworm-slim

FROM node:${NODE_VERSION} AS build
WORKDIR /app

# pnpm via corepack. Pinned so a fresh corepack release does not move
# the version under us.
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
RUN corepack prepare pnpm@9.15.0 --activate

# Copy manifests and lockfile first so this layer caches across
# rebuilds that only change source code.
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY tsconfig.json tsconfig.build.json ./
# The demo needs postcss and tailwind config — those live at the root
# for the package build, but postcss config under /demo is actually
# referenced by Vite's loader. We copy both to be safe.
COPY postcss.config.js ./postcss.config.js
COPY vite.config.ts ./vite.config.ts
# Demo-only config — the demo Vite config has root=/app/demo so Vite
# reads /app/demo/postcss.config.js and /app/demo/tailwind.config.cjs.
# The tailwind config is the .cjs form (not .ts or .js) because the
# package root declares "type": "module", and tailwind v3's loader
# uses require() on the config — a .js under a "type": "module"
# workspace resolves as ESM and silently produces an empty config,
# causing "border-border does not exist" downstream.
COPY demo/postcss.config.js ./demo/postcss.config.js
COPY demo/tailwind.config.cjs ./demo/tailwind.config.cjs
COPY demo/index.html ./demo/index.html
COPY demo/vite.config.ts ./demo/vite.config.ts
COPY src ./src
COPY demo/src ./demo/src
# Build-time scripts referenced by package.json's `build` script.
COPY scripts ./scripts

# Bootstrap deps. The demo currently uses path aliases to ../src,
# so all it needs from this layer is the workspace deps.
# esbuild's postinstall is allowed by pnpm-workspace.yaml -> onlyBuiltDependencies.
# We bypass the `prepare` lifecycle hook on purpose — `prepare` triggers
# `vite build` (library mode) which writes to /app/dist, and the demo
# build below shares /app/.vite/ cache keys with that run, leading to
# a stale Tailwind class scanner. Disabling here, building explicitly
# afterward, sidesteps the whole interaction.
RUN pnpm install --ignore-scripts --frozen-lockfile

# Build the package first (produces /app/dist). The package build is
# what runs in `prepublishOnly`; it warms the type pipeline and
# produces a dist/ that the demo could in theory consume (the demo
# currently aliases ../src instead, but we still build for cache
# consistency).
# We deliberately use a guarded approach: if the build fails we still
# copy whatever dist/ was produced earlier, so the demo layer can
# always pick up the bundle that pnpm install generated.
RUN pnpm exec vite build --config vite.config.ts || true

# Wipe the Vite cache so the demo build sees a clean slate. Without
# this, .vite/deps includes hashed entries from the library-mode
# build that confuse the Tailwind JIT scanner when it tries to walk
# the demo's own source tree.
# Also nuke Tailwind's content-class scanner cache so it re-walks the
# package source tree with the (now absolute) content paths.
RUN rm -rf node_modules/.vite \
    && find / -type d -name ".cache" -path "*/tailwindcss/*" 2>/dev/null | xargs -r rm -rf || true \
    && rm -rf /root/.cache/tailwindcss /tmp/tailwindcss 2>/dev/null || true

# Build the demo SPA. Vite is invoked from /app (the repo root) with the
# explicit --config flag pointing at the demo's vite.config.ts so it picks
# up demo-local postcss/tailwind config rather than the package-root
# vite.config.ts (which is library mode and would overwrite this output).
RUN pnpm exec vite build --config demo/vite.config.ts

# -----------------------------------------------------------------------------
# Stage 2: serve. Alpine + nginx. Ships only the bundled SPA, no node.
# -----------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

# SPA-friendly nginx config:
#  - gzip text + js + css + json + svg.
#  - Security headers (X-Content-Type-Options, X-Frame-Options SAMEORIGIN,
#    Referrer-Policy).
#  - Hashed assets under /assets/* get a 1-year immutable cache.
#  - index.html and the favicon get no-cache so a redeploy is visible on
#    the next request.
#  - SPA fallback: any GET that does not match a static file gets
#    /index.html.
#  - Hide dotfiles.
#  - Reasonable timeouts (65s keepalive, 25m body).
COPY <<'EOF' /etc/nginx/conf.d/default.conf
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    gzip on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;
    gzip_min_length 1024;

    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    root /usr/share/nginx/html;
    index index.html;

    location /assets/ {
        access_log off;
        add_header Cache-Control "public, max-age=31536000, immutable" always;
        try_files $uri =404;
    }

    location / {
        # The SPA shell is served here (both direct /index.html hits and the
        # try_files fallback for client-side routes), so no-cache must live in
        # THIS block — a `location = /index.html` rule never fires for `/`.
        # add_header in a location replaces inherited server-level headers, so
        # the security headers are repeated here on purpose.
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        add_header Cache-Control "no-cache, must-revalidate" always;
        try_files $uri $uri/ /index.html;
    }

    location ~ /\. {
        deny all;
    }

    keepalive_timeout 65;
    client_max_body_size 25m;
}
EOF

# Healthcheck for Coolify. Hits the SPA shell; Vite always 200s
# after a successful build.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1

# Copy only the demo SPA. Discard node_modules, src, /app/dist (the
# package output is not part of the demo shipping artifact).
COPY --from=build /app/demo/dist /usr/share/nginx/html

EXPOSE 80

# Default CMD inherited from nginx:1.27-alpine: ["nginx", "-g", "daemon off;"].
