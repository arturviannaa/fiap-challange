FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
RUN useradd --system --uid 10002 --home /app quiz
WORKDIR /app
COPY app app
COPY dados dados
COPY tests tests
# Os testes rodam no build: imagem com teste quebrado nao chega a existir.
RUN python -m unittest -q && rm -rf tests \
 && mkdir -p /app/var && chown quiz /app/var
USER quiz
ENV PORTA=8093 BANCO=/app/var/quiz.db
EXPOSE 8093
HEALTHCHECK --interval=30s --timeout=3s CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8093/saude', timeout=2)"
CMD ["python", "-m", "app"]
