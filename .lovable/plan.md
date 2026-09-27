# Aplicación de anime — Plan de construcción

## Aviso importante sobre las fuentes de video
Las fuentes de video de la lista (JKAnime, AnimeFLV, HiAnime, Gogoanime, AniWave, AnimeSuge, MonosChinos, etc.) publican episodios sin licencia. Hacer una app que encuentre y enlace automáticamente sus episodios sería distribuir contenido pirata, así que no voy a integrar esos sitios ni incluirlos en la lista inicial.

En su lugar, el sistema de "Fuentes de video" enlazará **solo plataformas oficiales**: Crunchyroll, Netflix, Prime Video, Disney+, HIDIVE, YouTube (canales oficiales como Muse Asia o Ani-One) y otras parecidas. Los enlaces por episodio vendrán de los datos oficiales de streaming de AniList y de los propios feeds de las plataformas. La arquitectura seguirá siendo extensible: el administrador podrá añadir más plataformas con licencia desde /admin.

Todo lo demás se construye como pediste.

## Fases (se entregan en orden, cada una funcional)

**Fase 1 — Base y datos reales**
- Activar Lovable Cloud (base de datos, autenticación, tareas programadas).
- Tablas: animes, títulos alternativos, episodios, enlaces por episodio, fuentes de video, fuentes de noticias, ejecuciones de sincronización, historial de cambios, errores, guardados, continuar viendo, preferencias y roles.
- Sincronización real: AniList (calendario de emisiones y enlaces oficiales) + Jikan como respaldo + feeds RSS de noticias (ANN, MAL News, Crunchyroll News, Anime Corner, Anime Herald, Anime UK News, Anime Trending, Tokyo Otaku Mode, Anime Expo).
- Manejo de errores por fuente: un 403 marca la fuente como "No disponible" sin reintentar; un 504 hace hasta 3 reintentos con espera creciente y límite de tiempo; si una fuente falla, las demás siguen (resultado "Sincronización parcial").
- Detección de duplicados usando títulos normalizados, alias, año, temporada e IDs externos.
- Historial de cambios con el valor anterior y el nuevo; los datos confirmados no se sobrescriben sin registrarlo.
- Tarea programada cada 5 horas en el servidor, protegida con un secreto.

**Fase 2 — App pública (estilo iOS)**
- Pantalla de inicio breve, barra inferior translúcida que respeta la zona del iPhone y cuatro pestañas: Nuevos, Videos, Guardados y Configuración.
- Nuevos: búsqueda (con espera entre teclas) y estrenos agrupados en Hoy, Mañana, Esta semana, Este mes y Próximamente.
- Detalles: portada grande sobre fondo desenfocado, toda la información pedida, botones "Ver episodios" y "Guardar" con animación.
- Videos: Continuar viendo, Últimos episodios, Actualizados recientemente y Todos (con paginación). Lista de episodios con botones "Ver en [plataforma oficial]".
- Guardados ordenados por el próximo estreno. Se guardan en el dispositivo y, si el usuario inicia sesión, en su cuenta.
- Configuración: tema (Oscuro, Negro puro o Automático), zona horaria (detectada y editable), notificaciones, última sincronización, estado de las fuentes y versión.
- Portadas con carga progresiva, placeholders animados, estados vacíos, aviso de "Sin conexión" con datos guardados en caché, y filtros.

**Fase 3 — Panel /admin**
- Protegido por inicio de sesión y rol de administrador (guardado en su propia tabla y verificado en el servidor). No habrá enlaces públicos hacia él.
- Cuenta de administrador para mayil.ramos.kv@gmail.com: te pediré la contraseña inicial mediante un formulario seguro. No quedará escrita en el código. Se podrá cambiar desde el panel.
- Resumen, Animes (editar, ocultar, restaurar, eliminar, historial), Episodios, Fuentes de información y Fuentes de video (probar, activar, sincronizar), "Sincronizar ahora" con progreso por etapas, registro de sincronizaciones y pantalla de errores.
- Barra lateral en escritorio y menú deslizable en el móvil.

**Fase 4 — Verificación real**
- Primera sincronización manual, con informe de cuántas fuentes respondieron y cuántas fallaron, animes nuevos, episodios nuevos y duplicados fusionados.
- Pruebas en el navegador del flujo principal, del panel de administración y de la vista en tamaño móvil y escritorio.

## Detalles técnicos
- TanStack Start con server functions; la sincronización y la tarea programada usan una ruta en /api/public/sync validada con un secreto; pg_cron + pg_net cada 5 horas.
- Adaptadores de fuente mediante una interfaz común (`fetch -> normalize -> merge`), registrados por `integration_method` para añadir fuentes sin tocar el resto del sistema.
- Fechas guardadas como timestamptz en UTC y convertidas en el cliente con Intl.
- Bloqueo de ejecución única (fila de lease), lotes acotados y progreso idempotente en la sincronización.
- Límite de peticiones básico en las funciones públicas; validación con Zod.
- Notificaciones: se guardan eventos y preferencias, y se muestran notificaciones dentro de la app; el push web se deja preparado para más adelante.
