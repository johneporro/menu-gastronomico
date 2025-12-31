# 🍕 Sistema de Pedidos Gastronómicos (Next.js + Google Sheets)

Un sistema completo de comercio electrónico enfocado en gastronomía, diseñado para ser rápido, económico y fácil de mantener. Utiliza **Google Sheets** como base de datos y CMS, eliminando la necesidad de un panel administrativo complejo o servidores de base de datos tradicionales.

## ✨ Características

- **Catálogo Dinámico**: Los productos se cargan directamente desde una hoja de Google Sheets.
- **Carrito de Compras**: Estado global persistente manejado con `Zustand`.
- **Pasarela de Pagos**: Integración con **Mercado Pago** y opción de pago en efectivo.
- **Seguimiento de Pedidos**: Los clientes pueden consultar el estado de su pedido en tiempo real usando un ID de seguimiento.
- **Gestión de Stock**: Control automático de stock al realizar pedidos; impide compras si no hay disponibilidad.
- **Control de Horarios**: El sistema verifica si el negocio está abierto antes de permitir una compra.
- **UI/UX Moderna**: Diseño responsivo con **Tailwind CSS v4**, animaciones con **Framer Motion** y componentes de **Shadcn/ui**.

## 🛠️ Stack Tecnológico

- **Frontend**: [Next.js 16](https://nextjs.org/) (App Router), React 19.
- **Lenguaje**: TypeScript.
- **Estilos**: Tailwind CSS 4, CSS Modules.
- **Backend**: Google Apps Script (Serverless).
- **Base de Datos**: Google Sheets.
- **Validación**: Zod.

## 🚀 Instalación y Configuración

### 1. Prerrequisitos

- Node.js 18 o superior.
- Una cuenta de Google (para Sheets y Apps Script).
- Una cuenta de Mercado Pago (para credenciales de prueba o producción).

### 2. Configuración de Google Sheets (Backend)

1. Crea una nueva hoja de cálculo en Google Sheets.
2. Renombra la pestaña principal a `Menu` y crea una segunda pestaña llamada `Pedidos`.
3. **Estructura de Columnas**:
    - **Hoja `Menu`** (Fila 1):
      `ID` | `Nombre` | `Categoria` | `Precio` | `Imagen` | `Descripcion` | `Ingredientes` | `Stock`
    - **Hoja `Pedidos`** (Fila 1):
      `ID` | `Fecha` | `Nombre` | `Celular` | `Tipo Entrega` | `Localidad` | `Día Entrega` | `Dirección` | `Método Pago` | `Items` | `Total` | `Estado`

### 3. Configuración de Google Apps Script

1. En tu hoja de cálculo, ve a **Extensiones > Apps Script**.
2. Borra el contenido y pega el código del archivo `googleAppScript.gs` de este repositorio.
3. **Configura tus secretos**:
   - Busca la función `setupScriptProperties` al final del archivo script.
   - Reemplaza los valores con tus datos reales (API Key inventada, Tokens de MercadoPago, etc.).
   - Ejecuta esta función una única vez manualmente desde el editor para guardar las credenciales de forma segura.
4. **Implementar**:
   - Haz clic en **Implementar > Nueva implementación**.
   - Selecciona el tipo **Aplicación web**.
   - Ejecutar como: **Yo**.
   - Quién tiene acceso: **Cualquier persona** (necesario para que la web pueda leer/escribir).
   - Copia la **URL de la aplicación web** generada.
  
El archivo Menu.gs te ayuda también a crear la hoja Menu con algunos productos. Una vez creado el archivo, se ejecuta la funcion setupMenuSheet (todo en GoogleAppScript).

### 4. Instalación del Proyecto (Frontend)

Clona el repositorio e instala las dependencias:

```bash
git clone <URL_DEL_REPOSITORIO>
cd menu-gastronomico
npm install
```

### 5. Variables de Entorno

Crea un archivo .env.local en la raíz del proyecto y configura las siguientes variables (basado en config/site.ts):

```code
# URL de tu Web App de Google Apps Script (obtenida en el paso 3)
GOOGLE_SCRIPT_URL=[https://script.google.com/macros/s/TU_SCRIPT_ID/exec](https://script.google.com/macros/s/TU_SCRIPT_ID/exec)

# La clave API que definiste en setupScriptProperties dentro de Apps Script
GOOGLE_API_KEY=tu_clave_secreta

# Tokens de Mercado Pago
MERCADOPAGO_ACCESS_TOKEN=APP_USR-tu-token-de-acceso
MERCADOPAGO_WEBHOOK_SECRET=tu-secreto-de-webhook

# Token para revalidación de caché (debe coincidir con el del Script)
REVALIDATE_SECRET=tu_secreto_revalidacion

# URL base del sitio (ej. localhost para desarrollo)
BASE_URL=http://localhost:3000
```

### 5. Ejecutar en Desarrollo

```code
npm run dev
```

Abre http://localhost:3000 en tu navegador.

### 📂 Estructura del Proyecto

```code
/app
  /(routes)           # Páginas principales (Carrito, Producto, Pedido)
  /api                # Endpoints API (Proxy a Sheets, Webhooks)
/components           # Componentes UI reutilizables (basados en Shadcn)
  /ui                 # Primitivas de diseño (Botones, Inputs, etc.)
/lib                  # Utilidades, Lógica de Google Sheets y Store
  googleSheets.ts     # Funciones de fetch para pedidos
  menuData.ts         # Funciones de fetch para el menú
  cartStore.ts        # Estado del carrito (Zustand)
/hooks                # Hooks personalizados (Checkout, Polling)
googleAppScript.gs    # Código del backend para Google Sheets
```
