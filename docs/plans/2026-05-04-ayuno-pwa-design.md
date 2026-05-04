# Documento de Diseño: App Ayuno Intermitente PWA

## Contexto y Objetivo
Aplicación PWA enfocada en el progreso de la salud (especialmente control de hipertensión y obesidad) que ofrece funcionalidades premium de forma gratuita. 

## Decisiones de Arquitectura e Interfaz (UI/UX)
1. **Protocolos de Ayuno:** Sistema flexible con selección manual en la web (14:10, 16:8, OMAD, etc.) para que el usuario tenga control total.
2. **Estructura del Dashboard:** Tablero Unificado (Estilo Apple Health). Un anillo central grande para el temporizador de ayuno, rodeado de widgets interactivos y compactos.
3. **Módulos de Salud:** Registro de consumo de agua, peso y, críticamente, **Presión Arterial**, integrados en los widgets del dashboard principal para no tener que cambiar de pantalla.
4. **Sistema de Diseño (Aesthetics):** 
   - **Tema:** Zafiro y Alta Tecnología (Estilo Médico Avanzado).
   - **Colores Base:** Modo oscuro profundo (gris mate oscuro / negro).
   - **Colores de Acento:** Azul eléctrico, cyan luminoso y tonos "neón" para barras de progreso y botones activos.
   - **Efectos Visuales:** *Glassmorphism* (tarjetas translúcidas con desenfoque de fondo) para una sensación moderna y limpia.
   - **Tipografía:** Moderna, geométrica y legible (ej. Inter o Outfit).

## Transición a Implementación (Fase 2)
El siguiente paso técnico es configurar el entorno base, crear la estructura de archivos HTML/CSS/JS y configurar el `manifest.json` para que funcione como una Progressive Web App (PWA).
