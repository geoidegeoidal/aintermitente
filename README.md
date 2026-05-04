# ⏳ AyunoPro - Control de Salud Premium

![Version](https://img.shields.io/badge/Versión-1.0.0-blue?style=for-the-badge&logo=appveyor)
![Estado](https://img.shields.io/badge/Estado-Producción-success?style=for-the-badge)
![Plataforma](https://img.shields.io/badge/Plataforma-PWA_|_Android_|_Web-orange?style=for-the-badge)
![Privacidad](https://img.shields.io/badge/Privacidad-Local__First-purple?style=for-the-badge)

<p align="center">
  <b>Una Progressive Web App (PWA) de nivel Premium, diseñada para potenciar tu pérdida de peso y el control de tu presión arterial.</b>
</p>

---

## 🌟 Visión General

AyunoPro no es solo un temporizador de ayuno. Es una herramienta clínica y personal diseñada para personas que buscan controlar la obesidad y la hipertensión sin depender de suscripciones mensuales costosas. 

Todo el poder de las aplicaciones de pago del mercado, construido bajo una estética "Glassmorphism" Zafiro/Neón, corriendo de manera 100% gratuita y privada en tu dispositivo mediante GitHub Pages.

### 🔗 **[Prueba la aplicación en vivo aquí](https://geoidegeoidal.github.io/aintermitente/)**

---

## ✨ Características Premium (Gratuitas)

- ⏱️ **Temporizador de Ayuno Inteligente:** Soporta protocolos de 14:10, 16:8, 18:6, 20:4 y OMAD.
- 🧬 **Rastreador de Zonas Metabólicas:** Visualiza en tiempo real cuándo tu cuerpo agota el glucógeno y entra en estado de Quema de Grasa o Autofagia celular.
- 🫀 **Módulo de Salud Cardiovascular:** Registro de Presión Arterial (Sistólica/Diastólica) y Frecuencia Cardíaca con gráficos interactivos de tendencia y clasificación automática (Normal, Elevada, Alta).
- ⚖️ **Control de Peso:** Registra tu progreso y observa curvas de pérdida de peso a lo largo de tus sesiones de ayuno.
- 💧 **Rastreador de Hidratación:** Conteo rápido de vasos de agua para asegurar un ayuno saludable y evitar dolores de cabeza.
- 🔒 **Seguridad Total (PIN):** Sistema de Bloqueo por código de 4 dígitos. Tus datos médicos se guardan *estrictamente de forma local* en la memoria de tu dispositivo (IndexedDB/localStorage) y jamás viajan a la nube. Eres el único dueño de tu información.

---

## 📱 Instalación Nativa (Android/iOS)

Esta aplicación es una **Progressive Web App (PWA)**, el estándar más moderno. No necesitas buscarla en la Play Store.

1. Abre el [enlace de la aplicación](https://geoidegeoidal.github.io/aintermitente/) en **Google Chrome** (Android) o **Safari** (iOS).
2. Toca el menú de opciones (los 3 puntitos en la esquina).
3. Selecciona **"Añadir a la pantalla de inicio"** o **"Instalar Aplicación"**.
4. ¡Listo! La app aparecerá junto a tus otras aplicaciones, tendrá su propio icono, y se ejecutará a pantalla completa y sin conexión a internet.

---

## 🛠️ Stack Tecnológico

Desarrollada para ser ultra ligera, ultrarrápida y muy fácil de mantener:
- **Core:** JavaScript ES6+ (Arquitectura Vanilla optimizada)
- **Construcción y Empaquetado:** Vite.js + `vite-plugin-pwa`
- **Interfaz y Estilos:** CSS3 nativo con uso avanzado de variables CSS, modo oscuro profundo y Glassmorphism UI.
- **Gráficos Estadísticos:** Chart.js
- **Base de Datos Local:** IndexedDB y LocalStorage
- **Despliegue y Hosting:** GitHub Pages (CI/CD Automático en la rama `gh-pages`)

---

## 🚀 Cómo correr el proyecto en local

Si deseas clonar el código fuente para aprender, desarrollar o agregar más funcionalidades:

```bash
# 1. Clonar el repositorio
git clone https://github.com/geoidegeoidal/aintermitente.git

# 2. Entrar a la carpeta
cd aintermitente

# 3. Instalar dependencias necesarias
npm install

# 4. Iniciar el servidor de desarrollo ultrarrápido
npm run dev
```

---

<p align="center">
  <i>Construido por y para la salud. Diseñado con precisión clínica y estética del futuro.</i><br>
  <b>Gemini 3.1 Pro x OpenCode (Qwen/DeepSeek)</b>
</p>
