# Guía de Despliegue de Themis en AWS EC2 con Name.com y Cloudflare

Esta guía te llevará paso a paso para desplegar los tres servicios de **Themis** (`web`, `core`, y `ai`) en una instancia de Amazon EC2, usando un único punto de entrada con Nginx que luego enrutaremos a través de Cloudflare para obtener HTTPS (SSL) y conectarlo con tu dominio en Name.com.

---

## 1. Preparativos en AWS EC2

1. **Crear la Instancia EC2**:
   - Inicia sesión en AWS Management Console y ve a **EC2**.
   - Haz clic en **Launch Instance**.
   - Elige **Ubuntu 24.04 LTS** (o similar) como AMI.
   - Elige el tipo de instancia (ej. `t3.medium` o `t3.large` dependiendo de los recursos que consuma el modelo de AI o la blockchain).
   - Configura o crea un **Key Pair** (`.pem` o `.ppk`) para acceder por SSH.
   
2. **Configurar el Security Group (Cortafuegos)**:
   Asegúrate de tener abiertas las siguientes reglas de entrada (Inbound Rules) al crear la instancia:
   - **SSH (Puerto 22)**: Desde "My IP" o "Anywhere" (0.0.0.0/0).
   - **HTTP (Puerto 80)**: Desde "Anywhere" (0.0.0.0/0).
   - **HTTPS (Puerto 443)**: Desde "Anywhere" (0.0.0.0/0) (Cloudflare usará este).

3. **Asignar Elastic IP (Opcional pero recomendado)**:
   - En el panel izquierdo de EC2, ve a **Elastic IPs**.
   - Asigna una nueva IP y asóciala a tu instancia recién creada. Esta IP no cambiará si reinicias la instancia.

---

## 2. Configurar el Servidor y Docker

Conéctate a tu instancia EC2 usando SSH. Sustituye `[TU_IP]` y `[TU_LLAVE.pem]` según corresponda:

```bash
ssh -i [TU_LLAVE.pem] ubuntu@[TU_IP]
```

1. **Instalar Docker y Docker Compose**:

```bash
# Actualizar los paquetes
sudo apt update && sudo apt upgrade -y

# Instalar Docker
sudo apt install docker.io -y

# Instalar Docker Compose
sudo apt install docker-compose-v2 -y

# Dar permisos a tu usuario (para evitar usar sudo docker)
sudo usermod -aG docker ubuntu
```
*Nota: Es posible que necesites cerrar sesión y volver a entrar (exit -> ssh) para que los permisos surtan efecto.*

2. **Clonar el Proyecto**:

```bash
# Sube o clona tu código desde GitHub
git clone https://github.com/[TU_USUARIO]/themis.git
cd themis
```

3. **Configurar Variables de Entorno**:

Antes de iniciar, necesitas asegurarte de tener los archivos `.env` en cada directorio.

```bash
cp themis-core/.env.example themis-core/.env
cp themis-ai/.env.example themis-ai/.env
# Edita los archivos según sea necesario
nano themis-core/.env
```

4. **Levantar los Contenedores**:

Desde la raíz del proyecto (donde está el archivo `docker-compose.yml` principal):

```bash
docker compose up -d --build
```
Esto construirá y levantará:
- `chain` (Blockchain local con Hardhat)
- `core` (Backend NestJS)
- `ai` (Servicio de Inteligencia Artificial Python)
- `web` (Frontend React/Vite)
- `proxy` (Nginx enrutando el puerto 80)

Para comprobar que todo está corriendo, ejecuta:
```bash
docker compose ps
```

Puedes ir en tu navegador a `http://[TU_IP]/` y deberías ver el frontend.

---

## 3. Conectar Name.com con Cloudflare

Para que tu sitio use HTTPS gratuito y tenga protección DDoS, utilizaremos Cloudflare como manejador DNS.

1. **Crear cuenta en Cloudflare**:
   - Entra a [Cloudflare.com](https://dash.cloudflare.com) y crea una cuenta.
   - Haz clic en **Add a Site** y pon el nombre de tu dominio (ej. `midominio.com`).
   - Selecciona el **Plan Gratuito** (Free Plan).
   
2. **Obtener los Name Servers (NS)**:
   - Cloudflare escaneará tus DNS actuales y te dará **dos Name Servers** (ej. `emma.ns.cloudflare.com` y `lucas.ns.cloudflare.com`).
   - Deja esa pestaña abierta.

3. **Cambiar los Name Servers en Name.com**:
   - Inicia sesión en Name.com y ve a la sección de **Mis Dominios**.
   - Haz clic en tu dominio y busca la opción **Name Servers** (o Servidores de Nombre).
   - Elimina los de Name.com y **agrega los dos Name Servers** que te dio Cloudflare.
   - Guarda los cambios. (Este cambio puede tardar desde unos minutos hasta 24h en propagarse).

---

## 4. Configurar DNS y HTTPS en Cloudflare

1. **Crear el Registro DNS**:
   - Regresa a Cloudflare y ve a la pestaña **DNS** > **Records** (Registros).
   - Agrega un **Registro A** (A Record):
     - **Name**: `@` (o `www`)
     - **IPv4 address**: Escribe la IP pública (Elastic IP) de tu EC2 en AWS.
     - **Proxy status**: Asegúrate de que la nube esté naranja (Proxied).
   - Haz clic en **Save**.

2. **Habilitar HTTPS (SSL/TLS)**:
   - En el menú izquierdo de Cloudflare, ve a **SSL/TLS** > **Overview**.
   - Elige el modo **Flexible**. 
     *(Nota: Como estamos usando el puerto 80 no encriptado entre Cloudflare y AWS, Flexible encriptará el tráfico entre el Usuario y Cloudflare, y luego enviará la solicitud por el puerto 80 al EC2, donde nuestro Nginx lo recibe. Si más adelante añades certificados SSL locales al EC2, podrías cambiar a Full)*.

3. **Forzar HTTPS**:
   - Ve a **SSL/TLS** > **Edge Certificates**.
   - Busca la opción **Always Use HTTPS** y actívala.

---

## 5. ¡Listo!

Ahora, si visitas `https://midominio.com`, el flujo será:
1. El usuario entra a la URL con HTTPS.
2. Cloudflare recibe la petición, desencripta el tráfico y lo manda como HTTP a la IP de tu EC2 (puerto 80).
3. El Nginx de tu EC2 (en el contenedor `proxy`) recibe la petición y la enruta:
   - Si la ruta es `/`, se la pasa al contenedor `web` (Frontend).
   - Si la ruta es `/api/`, se la pasa al contenedor `core` (Backend NestJS).
   - Si la ruta es `/ai/`, se la pasa al contenedor `ai` (FastAPI).

### Notas Finales
- Si haces cambios en el código, simplemente haz un `git pull` en la instancia y ejecuta `docker compose up -d --build` para actualizar los contenedores.
- Si el servicio de AI usa rutas internas sin `/ai/`, nuestro Nginx ya se encarga de reescribir la URL quitando el `/ai/` gracias a la instrucción `rewrite ^/ai/(.*)$ /$1 break;`.
