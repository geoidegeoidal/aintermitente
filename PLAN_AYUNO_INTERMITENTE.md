# Plan de Implementación: App de Ayuno Intermitente "Premium" (Actualizado Mayo 2026)

## Visión General
Desarrollar una **Progressive Web App (PWA)** alojada en GitHub Pages que ofrezca funcionalidades "premium" gratuitas de las apps de ayuno. Enfoque especial en el control de obesidad e hipertensión.

---

## 🚀 Registro de Avances y Asignación de Modelos de IA (Checklist)

A continuación se detalla cada fase del proyecto junto con el **modelo de Inteligencia Artificial (estado del arte a Mayo de 2026)** más recomendado para ejecutar dichas tareas específicas, aprovechando las fortalezas de cada uno.

### Fase 1: Planificación y Diseño UI/UX
*🤖 Modelo Sugerido: **Gemini 3.1 Pro (High)*** *(Excelente para razonamiento complejo, UX, creatividad de diseño y arquitectura visual de alto nivel).*
- [x] Definir protocolos de ayuno (Decisión: Selector manual en la web para que el usuario elija su protocolo).
- [x] Definir módulos a rastrear (Decisión: Tablero unificado con widgets estilo Apple Health).
- [x] Diseñar módulo de salud cardiovascular (Decisión: Registro de Peso y Presión integrados en el dashboard principal).
- [x] Establecer sistema de diseño "Premium" (Decisión: Modo Oscuro "Zafiro/Alta Tecnología" con acentos cyan/neón y glassmorphism).

### Fase 2: Configuración del Entorno y Estructura ✅
*🤖 Modelo Sugerido: **Qwen 2.5 Coder*** *(Muy rápido y ultra preciso para scaffolding, configuraciones de entorno y setup de PWA).*
- [x] Inicializar el repositorio Git en la carpeta local (`c:\JULLOAR-CODE\sp\aintermitente`).
- [x] Configurar el esqueleto del proyecto web (Vite + Vanilla JS / React).
- [x] Maquetar la estructura HTML/CSS de la UI (Layout principal y menú de navegación).
- [x] Crear el archivo `manifest.json` y el `Service Worker` para convertir la web en una **PWA instalable en Android**.

### Fase 3: Desarrollo del Core (MVP) ✅
*🤖 Modelo Sugerido: **DeepSeek Coder (V2)*** *(El mejor modelo OpenCode actual para lógica compleja, manejo estricto de estados, fechas y algoritmos en JavaScript).*
- [x] Programar la lógica del Temporizador de Ayuno (iniciar, pausar, detener, cálculo en vivo de zonas metabólicas).
- [x] Crear el Dashboard principal con anillos de progreso visuales (manipulación de SVG/Canvas).
- [x] Implementar la persistencia de datos (usar la API `IndexedDB` o `localStorage` para guardar el historial sin costo de servidor).

### Fase 4: Funcionalidades de Salud y Gráficos ✅
*🤖 Modelo Sugerido: **GLM-4** o **DeepSeek Coder*** *(Altamente efectivos en transformación de datos, matemáticas e integración de librerías de terceros).*
- [x] Desarrollar la pantalla de registro diario de Peso con validaciones.
- [x] Desarrollar la pantalla de registro de Presión Arterial (Sistólica/Diastólica) y Frecuencia Cardíaca.
- [x] Integrar gráficos interactivos (ej. ECharts o Chart.js) para renderizar curvas de tendencia de salud y ayuno.
- [x] Programar notificaciones locales para hidratación o aviso de fin de ayuno.

### Fase 5: Pulido, Pruebas y Despliegue
*🤖 Modelo Sugerido: **Gemini 3.1 Pro (High)*** *(Insuperable para auditoría estética final, CSS avanzado, animaciones fluidas y visión holística del proyecto).*
- [x] Auditoría estética final (Animaciones *fade-in* añadidas, hover states pulidos en botones y tarjetas, validación del tema Zafiro completada).
- [ ] Pruebas reales instalando la PWA en un dispositivo Android. *(¡Te toca a ti! Abre el link en tu celular)*
- [x] Subir el código definitivo al repositorio de GitHub.
- [x] Configurar y desplegar la aplicación a través de **GitHub Pages**.

---

*Nota: Puedes marcar las casillas colocando una "x" dentro de los corchetes `[x]` a medida que vayamos completando cada tarea.*
