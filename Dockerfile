# Cocoso as a standard Meteor bundle: build the bundle with the Meteor tool,
# then run it on a plain Node image. See docs/DEPLOYMENT.md.

# Node 24 to match the Meteor 3.5 dev bundle, which builds and runs on it.
ARG NODE_IMAGE=node:24-bookworm
ARG RUNTIME_IMAGE=node:24-bookworm-slim

# --------------------------------------------------------------------------
# Build the Meteor bundle
# --------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS builder

ARG METEOR_VERSION=3.5.2

ENV METEOR_ALLOW_SUPERUSER=true \
    TOOL_NODE_FLAGS=--max-old-space-size=4096

# Every download below has both an IPv6 and an IPv4 address, and containers have
# no IPv6 route by default: getaddrinfo hands out the v6 one first and the
# connection just times out. Prefer IPv4 before anything touches the network.
RUN echo 'precedence ::ffff:0:0/96  100' >> /etc/gai.conf \
 && printf 'Acquire::ForceIPv4 "true";\nAcquire::Retries "5";\n' \
      > /etc/apt/apt.conf.d/99-network

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      build-essential python3 git curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL "https://install.meteor.com/?release=${METEOR_VERSION}" | sh

WORKDIR /source
COPY . .

# patch-package runs as a postinstall hook and needs patches/ in place.
# Retried because node-pre-gyp and node-gyp fetch prebuilt binaries and headers
# from hosts that are not always reachable on the first try.
RUN for attempt in 1 2 3; do \
      meteor npm ci --no-audit --no-fund \
        --fetch-retries 5 --fetch-retry-maxtimeout 120000 && break; \
      echo "npm ci attempt $attempt failed, retrying"; \
      sleep 15; \
    done; \
    test -d node_modules/react

# percolate:migrations depends on phantomjs-prebuilt, whose installer has no
# linux/arm64 download and aborts the whole Meteor build. It accepts any
# `phantomjs` on PATH that reports version 2.1.1 without downloading, and
# nothing at runtime ever runs PhantomJS, so a stub is enough.
RUN printf '#!/bin/sh\necho 2.1.1\n' > /usr/local/bin/phantomjs \
 && chmod +x /usr/local/bin/phantomjs

# No --architecture: the bundle is built for the platform of this image, which
# is the platform the runtime stage uses too. Retried because the build pulls
# every Atmosphere package over the network.
RUN for attempt in 1 2 3; do \
      meteor build --directory /build --server-only && break; \
      echo "meteor build attempt $attempt failed, retrying"; \
      rm -rf /build; sleep 15; \
    done; \
    test -d /build/bundle

# Native modules (bcrypt, sharp) are compiled here against the same Debian and
# Node version the runtime stage ships.
WORKDIR /build/bundle/programs/server
RUN for attempt in 1 2 3; do \
      npm install --omit=dev --no-audit --no-fund \
        --fetch-retries 5 --fetch-retry-maxtimeout 120000 && break; \
      echo "server npm install attempt $attempt failed, retrying"; \
      sleep 15; \
    done

# --------------------------------------------------------------------------
# Runtime
# --------------------------------------------------------------------------
FROM ${RUNTIME_IMAGE} AS runtime

ENV NODE_ENV=production \
    PORT=3000 \
    MEDIA_STORAGE_PATH=/var/lib/cocoso/media

# Node trusts its own compiled-in roots, but give OpenSSL a bundle too. Taken
# from the build stage so the runtime stage needs no network.
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt

COPY docker/entrypoint.sh /usr/local/bin/cocoso-entrypoint
RUN chmod +x /usr/local/bin/cocoso-entrypoint

WORKDIR /app
COPY --from=builder --chown=node:node /build/bundle /app

# Uploads must outlive the container; mount a volume here.
RUN mkdir -p "$MEDIA_STORAGE_PATH" && chown -R node:node /var/lib/cocoso

USER node
EXPOSE 3000

ENTRYPOINT ["cocoso-entrypoint"]
CMD ["node", "main.js"]
