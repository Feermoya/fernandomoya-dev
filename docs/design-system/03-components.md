# 03 · Componentes

| Componente conceptual | Contrato |
|---|---|
| PortfolioHeader | FM, navegación breve, menú solo si hace falta |
| HeroIntro | Qué hago, para quién, dos acciones |
| SectionHeading | Overline opcional, título y breve introducción |
| PrimaryButton | Fondo tinta, texto blanco, mínimo 44px, foco visible |
| SecondaryButton | Blanco, borde sutil, tamaño equivalente |
| ProjectCard | Foto real, nombre, categoría, frase útil, acción |
| ProjectFilter | Implementar solo si categorías reales justifican el filtro |
| ServiceCard | Ícono Lucide tintado, título, frase útil y flecha si navega |
| ProjectDetail | Imagen, resumen, capacidades reales, galería y link |
| ContactCta | Invitación breve y WhatsApp/email |
| PortfolioFooter | Cierre mínimo con enlaces útiles |

## Tarjetas de proyectos
Imagen, nombre (máximo 2 líneas), categoría, descripción concisa opcional, flecha. Si tiene un destino único, hacer clickeable toda la tarjeta con etiqueta accesible. No colocar botones anidados en enlaces.

A 375px usar una columna para trabajos principales con capturas legibles. Carrusel horizontal si agrega valor. Usar dos columnas para tarjetas realmente compactas y suficiente ancho. No truncar contenido útil en cards estrechas.

## Cards de servicios
Ícono 20–22px dentro de contenedor 44px. Título 16–18px, cuerpo 14–15px, padding 18–20px, flecha solo si cumple una función.

## Estados
Default, hover donde exista, focus-visible, pressed, disabled, loading cuando aplique. Menús y diálogos con gestión de foco, Escape y retorno al disparador. No incluir navegación inferior automáticamente.
