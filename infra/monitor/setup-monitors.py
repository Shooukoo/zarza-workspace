"""Crea el usuario admin de Uptime Kuma (si es la primera vez) y los monitores.
Idempotente: no duplica monitores que ya existan con el mismo nombre.

  docker run --rm --network host -e KUMA_URL -e KUMA_USER -e KUMA_PASSWORD \
    -v "$PWD/infra/monitor/setup-monitors.py:/s.py:ro" python:3.12-slim \
    sh -c "pip install -q uptime-kuma-api && python /s.py"
"""
import os
from uptime_kuma_api import MonitorType, UptimeKumaApi

EDGE, APP, IA, DATOS = "100.123.82.0", "100.112.223.6", "100.115.227.49", "100.109.194.99"

HTTP = [
    ("Web pública (https://rubusai.tech)", "https://rubusai.tech/"),
    ("API pública vía nginx", "https://rubusai.tech/api/v1/health"),
    ("nginx (rubus-edge)", f"http://{EDGE}/healthz"),
    ("fruit-backend (rubus-app)", f"http://{APP}:3000/api/v1/health"),
    ("fruit-ms (rubus-app)", f"http://{APP}:3002/health"),
    ("fruit-inference (rubus-ia)", f"http://{IA}:8000/health"),
    ("fruit-training (rubus-ia)", f"http://{IA}:8001/health"),
]
# Solo puerto TCP: así Kuma no guarda contraseñas de la capa de datos.
TCP = [
    ("PostgreSQL (rubus-datos)", DATOS, 5432),
    ("RabbitMQ (rubus-datos)", DATOS, 5672),
    ("Redis (rubus-datos)", DATOS, 6379),
]

user, password = os.environ["KUMA_USER"], os.environ["KUMA_PASSWORD"]
with UptimeKumaApi(os.environ["KUMA_URL"]) as api:
    if api.need_setup():
        api.setup(user, password)
    api.login(user, password)
    existentes = {m["name"] for m in api.get_monitors()}
    for nombre, url in HTTP:
        if nombre not in existentes:
            api.add_monitor(type=MonitorType.HTTP, name=nombre, url=url, interval=60,
                            maxretries=2, expiryNotification=url.startswith("https"))
    for nombre, host, puerto in TCP:
        if nombre not in existentes:
            api.add_monitor(type=MonitorType.PORT, name=nombre, hostname=host, port=puerto,
                            interval=60, maxretries=2)
    print("monitores:", sorted(m["name"] for m in api.get_monitors()))
