# Update the reviewed index digest via a pull request. Build for linux/amd64.
FROM public.ecr.aws/lambda/nodejs:24@sha256:5f161369102f24d3b088ca52e8e83eeee55e701080ee91af858b4cb2f762b6ef

ARG WEBWATCH_CAPTURE_RELEASE
ARG WEBWATCH_CAPTURE_SOURCE_SHA256
ARG WEBWATCH_REQUIRE_DEPENDENCY_LOCKS=0
ENV NODE_ENV=production \
    APP_ENV=aws \
    HOME=/tmp \
    XDG_CACHE_HOME=/tmp/.cache \
    WEBWATCH_SERVERLESS_CHROMIUM=1 \
    WEBWATCH_CAPTURE_RELEASE=${WEBWATCH_CAPTURE_RELEASE} \
    WEBWATCH_CAPTURE_SOURCE_SHA256=${WEBWATCH_CAPTURE_SOURCE_SHA256}

LABEL ca.redcloversoftware.webwatch.capture.release=${WEBWATCH_CAPTURE_RELEASE} \
      ca.redcloversoftware.webwatch.capture.source-sha256=${WEBWATCH_CAPTURE_SOURCE_SHA256}

# Lambda's Node.js 22 base includes the runtime interface client. The Chromium
# package supplies its Lambda-compatible binary, shared libraries, fonts, and
# launch arguments. Pixel processing runs in the managed Worker Lambda through
# architecture-independent JavaScript dependencies.
RUN dnf install -y ca-certificates \
  && dnf clean all \
  && rm -rf /var/cache/dnf

WORKDIR ${LAMBDA_TASK_ROOT}
COPY infra/docker/browser-worker/package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev --ignore-scripts --no-audit --no-fund; \
    elif [ "$WEBWATCH_REQUIRE_DEPENDENCY_LOCKS" = "1" ]; then echo 'Browser dependency lock is required before release.' >&2; exit 1; \
    else echo 'WARNING: browser dependencies are unlocked; review generated release evidence.' >&2; npm install --omit=dev --ignore-scripts --no-audit --no-fund; fi \
  && npm sbom --omit=dev --sbom-format cyclonedx > dependency.sbom.cdx.json \
  && npm cache clean --force \
  && rm -rf /root/.npm/_logs

COPY src ./src
RUN node -e "if (Number(process.versions.node.split('.')[0]) !== 22) throw new Error('Worker image must use Node 22'); Promise.all([import('playwright-core'), import('@sparticuz/chromium')]).then(([pw, mod]) => { const chromium = mod.default ?? mod; if (!pw.chromium || !Array.isArray(chromium.args) || typeof chromium.executablePath !== 'function') throw new Error('Lambda Chromium driver is incomplete'); })"

CMD ["src/aws/capture-handler.handler"]
