#!/usr/bin/env bash
# Base común de las VPS de Rubus AI (Ubuntu). Idempotente: se puede re-ejecutar.
#
#   bash vps-base.sh <hostname> "<llave pública>" <tailscale-authkey>
#   bash vps-base.sh harden     # SOLO tras comprobar que `ssh deploy@IP` funciona
#
# El modo normal NO toca sshd: root y contraseña siguen funcionando hasta `harden`.
set -euo pipefail

[ "$(id -u)" -eq 0 ] || { echo "Ejecutar como root (o con sudo)" >&2; exit 1; }

if [ "${1:-}" = "harden" ]; then
  # Sin esta comprobación, harden dejaría la VPS sin ningún acceso por SSH.
  [ -s /home/deploy/.ssh/authorized_keys ] || { echo "deploy no tiene llave: abortado" >&2; exit 1; }
  # 00- porque sshd usa el primer valor que lee y cloud-init deja un 50- con PasswordAuthentication yes.
  cat > /etc/ssh/sshd_config.d/00-rubus.conf <<'EOF'
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
AllowUsers deploy
EOF
  sshd -t
  systemctl reload ssh
  echo "SSH endurecido: solo deploy, solo llave."
  exit 0
fi

HOSTNAME_NUEVO="${1:?falta hostname}"
LLAVE_PUBLICA="${2:?falta llave pública}"
TS_AUTHKEY="${3:?falta auth key de Tailscale}"

case "$LLAVE_PUBLICA" in
  ssh-ed25519\ *|ssh-rsa\ *|ecdsa-sha2-*\ *) ;;
  *) echo "El segundo argumento no parece una llave pública SSH" >&2; exit 1 ;;
esac

export DEBIAN_FRONTEND=noninteractive

hostnamectl set-hostname "$HOSTNAME_NUEVO"
grep -q "127.0.1.1 $HOSTNAME_NUEVO" /etc/hosts || echo "127.0.1.1 $HOSTNAME_NUEVO" >> /etc/hosts

# Espera al apt-daily del sistema en vez de fallar; en un archivo para que también
# aplique al apt-get que lanza el instalador de Tailscale.
echo 'DPkg::Lock::Timeout "600";' > /etc/apt/apt.conf.d/99-lock-timeout
apt-get update -q
apt-get upgrade -yq
# Docker de los repos de Ubuntu: sin repositorio externo que dependa de la versión de la distro.
apt-get install -yq ufw fail2ban unattended-upgrades curl ca-certificates docker.io docker-compose-v2

# ── Usuario deploy ───────────────────────────────────────────────────────────
id deploy >/dev/null 2>&1 || adduser --disabled-password --gecos "" deploy
usermod -aG sudo,docker deploy
# sudo sin contraseña: deploy no tiene contraseña y los despliegues son no interactivos.
echo "deploy ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/90-deploy
chmod 440 /etc/sudoers.d/90-deploy
visudo -cf /etc/sudoers.d/90-deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
echo "$LLAVE_PUBLICA" > /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys

# ── Docker: rotación de logs para no llenar el disco ─────────────────────────
if [ ! -f /etc/docker/daemon.json ]; then
  echo '{"log-driver":"json-file","log-opts":{"max-size":"10m","max-file":"3"}}' > /etc/docker/daemon.json
  systemctl restart docker
fi
systemctl enable -q docker

# Los contenedores publican puertos en la IP de Tailscale. Tras un reinicio Docker
# puede arrancar antes de que esa IP exista; esto le permite enlazarla igualmente.
echo 'net.ipv4.ip_nonlocal_bind=1' > /etc/sysctl.d/99-rubus.conf
sysctl -q --system

# ── Tailscale ────────────────────────────────────────────────────────────────
command -v tailscale >/dev/null || curl -fsSL https://tailscale.com/install.sh | sh
tailscale status >/dev/null 2>&1 || tailscale up --authkey "$TS_AUTHKEY" --hostname "$HOSTNAME_NUEVO"

# ── Firewall ─────────────────────────────────────────────────────────────────
# Ojo: Docker salta UFW para puertos publicados; por eso los compose publican
# solo en la IP de Tailscale. 80/443 se abren aparte, solo en rubus-edge.
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow in on tailscale0
ufw --force enable

echo
echo "Listo: $HOSTNAME_NUEVO  tailscale=$(tailscale ip -4)"
echo "Siguiente: probar 'ssh deploy@<IP>' en una conexión nueva y luego 'sudo bash vps-base.sh harden'."
