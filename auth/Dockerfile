# Compila em uma imagem com toolchain e roda numa imagem enxuta, so com as libs.
FROM debian:bookworm-slim AS build
RUN apt-get update \
 && apt-get install -y --no-install-recommends g++ cmake make ca-certificates libssl-dev libsqlite3-dev xz-utils \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /src
COPY CMakeLists.txt .
COPY src src
COPY tests tests
RUN cmake -S . -B build -DCMAKE_BUILD_TYPE=Release \
 && cmake --build build -j"$(nproc)" \
 && ctest --test-dir build --output-on-failure

FROM debian:bookworm-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends libssl3 libsqlite3-0 ca-certificates curl \
 && rm -rf /var/lib/apt/lists/* \
 && useradd --system --uid 10001 --home /app auth
WORKDIR /app
COPY --from=build /src/build/anamnea-auth /app/anamnea-auth
RUN mkdir -p /app/var && chown auth /app/var
USER auth
ENV PORTA=8092 BANCO=/app/var/auth.db
EXPOSE 8092
HEALTHCHECK --interval=30s --timeout=3s CMD curl -fs http://127.0.0.1:8092/saude || exit 1
CMD ["/app/anamnea-auth"]
