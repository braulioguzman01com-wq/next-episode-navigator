# Anime Watchlist Pro

CREAR APLICACIÓN DE ANIME DESDE CERO

Quiero crear desde cero una aplicación móvil/web progresiva enfocada en descubrir próximos estrenos de anime, consultar información, guardar animes, detectar nuevos episodios automáticamente y encontrar fuentes externas disponibles.

Quiero una aplicación REAL y funcional.

NO quiero una demostración estática.

NO quiero datos falsos.

NO quiero listas escritas manualmente dentro del frontend.

Toda la información debe provenir de fuentes reales y almacenarse correctamente en la base de datos.

La aplicación debe estar preparada para crecer a miles de animes y múltiples fuentes.

⸻

1. CONCEPTO GENERAL

La aplicación debe sentirse como una aplicación nativa premium de iPhone.

La estética debe estar inspirada en iOS moderno, especialmente en el lenguaje visual de iOS 26/27:

* Glassmorphism
* Transparencias
* Blur
* Profundidad
* Capas
* Animaciones suaves
* Microinteracciones
* Tipografía limpia
* Espacios amplios
* Controles minimalistas
* Transiciones fluidas
* Elementos con sensación de profundidad

No quiero que parezca una página web tradicional.

Debe sentirse como una aplicación de entretenimiento profesional.

La prioridad es:

FLUIDEZ > CANTIDAD DE ELEMENTOS

No saturar las pantallas.

⸻

2. TECNOLOGÍA Y ARQUITECTURA

Crear una arquitectura moderna y mantenible.

Separar correctamente:

Frontend
Backend
Base de datos
Autenticación
Scheduler
Sincronización
Fuentes
Administración
Notificaciones

Nunca colocar claves privadas en el frontend.

Utilizar variables de entorno/secrets para:

API keys
Credenciales
Tokens
Webhooks
Servicios externos

Crear endpoints backend seguros para todas las operaciones sensibles.

⸻

3. DISEÑO GENERAL

Utilizar un fondo oscuro elegante.

Preferentemente:

* Negro
* Gris extremadamente oscuro
* Transparencias
* Superficies translúcidas

Evitar colores excesivamente saturados.

Los colores de acento deben utilizarse únicamente para:

* Estado
* Disponibilidad
* Acciones importantes
* Indicadores
* Notificaciones

No utilizar emojis.

Utilizar iconos profesionales.

⸻

4. EFECTO GLASS

Los elementos importantes deben utilizar superficies similares a:

glassmorphism.

Ejemplo visual:

background translúcido
blur
border extremadamente sutil
sombra suave

No utilizar tarjetas blancas tradicionales.

No colocar todo dentro de cajas.

Algunas secciones deben integrarse directamente con el fondo.

⸻

5. ANIMACIONES

Todas las animaciones deben ser suaves.

Utilizar:

* Fade
* Scale
* Slide
* Blur transition
* Spring
* Parallax ligero
* Crossfade

Evitar animaciones exageradas.

No hacer que los elementos salten o se muevan demasiado.

Las transiciones deben sentirse similares a una aplicación nativa.

⸻

6. MICROINTERACCIONES

Cuando el usuario toque un botón:

* Pequeña respuesta visual
* Scale ligero
* Cambio de opacidad
* Animación rápida

Al guardar un anime:

El icono debe transformarse suavemente.

Al cambiar de pestaña:

La transición debe ser fluida.

Al abrir un anime:

La portada debe utilizar una transición visual elegante hacia la pantalla de detalles.

⸻

7. SPLASH SCREEN

Crear una pantalla inicial minimalista.

Mostrar el logotipo/nombre de la aplicación.

Animación:

Fade in
Pequeña escala
Blur → claridad

Después realizar una transición suave hacia la aplicación.

No utilizar una pantalla de carga larga.

⸻

8. NAVEGACIÓN INFERIOR

Crear una barra inferior estilo iOS.

Pestañas:

Nuevos
Videos
Guardados
Configuración

La barra debe:

* Ser translúcida
* Tener blur
* Respetar Safe Area
* Permanecer estable
* Tener transición al cambiar de pestaña
* No cubrir contenido
* Adaptarse a diferentes tamaños de pantalla

En iPhone debe respetar correctamente el área del Home Indicator.

⸻

9. PANTALLA NUEVOS

Esta será la pantalla principal.

En la parte superior:

Título:

Nuevos

Debajo:

Próximos estrenos

Agregar búsqueda.

Después mostrar los estrenos agrupados:

HOY

MAÑANA

ESTA SEMANA

PRÓXIMAMENTE

MES

Cada anime debe utilizar una tarjeta visual compacta y elegante.

Mostrar:

Portada
Nombre
Fecha
Hora
Estado

No mostrar demasiada información directamente.

Al tocar la tarjeta:

abrir detalles.

⸻

10. PORTADAS

Las imágenes deben:

* Cargar progresivamente
* Tener placeholder
* Mantener proporción
* No deformarse
* Utilizar lazy loading
* Tener transición al cargar

Mientras carga:

mostrar un skeleton elegante.

Si la imagen falla:

mostrar un placeholder profesional.

No mostrar una imagen rota.

⸻

11. SKELETON LOADING

No mostrar una pantalla blanca mientras carga.

Crear skeletons similares al contenido real.

Por ejemplo:

rectángulo de portada
líneas de texto
líneas secundarias

Utilizar animación shimmer extremadamente sutil.

⸻

12. DETALLES DEL ANIME

Al tocar un anime:

Abrir una pantalla de detalles.

La transición debe ser fluida.

Mostrar:

Portada grande.

Fondo desenfocado basado en la portada.

Gradiente oscuro.

Nombre.

Nombre japonés.

Nombres alternativos.

Sinopsis.

Géneros.

Año.

Temporada.

Estudio.

Estado.

Episodios.

Duración.

Fecha de estreno.

Próximo episodio.

Hora local.

Fuentes.

⸻

13. BOTONES DEL ANIME

Botón principal:

Ver episodios

Botón secundario:

Guardar

El botón Guardar debe cambiar visualmente cuando el anime ya esté guardado.

⸻

14. FECHAS

Todas las fechas deben almacenarse de manera normalizada.

Mostrar al usuario la hora correspondiente a su zona horaria.

Detectar automáticamente la zona horaria.

Permitir cambiarla desde Configuración.

Nunca asumir que todos los usuarios utilizan la misma zona horaria.

⸻

15. VIDEOS

Crear una pestaña:

Videos

Esta será la biblioteca de episodios.

En la parte superior:

Buscar anime

Después:

Continuar viendo

Últimos episodios

Actualizados recientemente

Todos los animes

⸻

16. TARJETAS DE VIDEOS

Cada anime debe mostrar:

Portada
Nombre
Último episodio
Cantidad de episodios disponibles
Última actualización

Al tocar:

abrir detalles.

⸻

17. EPISODIOS

Mostrar los episodios verticalmente.

Ejemplo:

EPISODIO 12
Disponible

EPISODIO 11
Disponible

EPISODIO 10
Disponible

etc.

Cada episodio debe mostrar las fuentes disponibles.

Ejemplo:

Episodio 12

Fuente A
Ver

Fuente B
Ver

Fuente C
Ver

⸻

18. FUENTES EXTERNAS

La aplicación funcionará como agregador.

NO descargar videos.

NO almacenar videos.

NO copiar videos.

NO redistribuir videos.

Cuando exista una fuente externa disponible:

abrir la URL correspondiente.

El sistema debe permitir registrar diferentes fuentes desde administración.

⸻

19. FUENTES DE VIDEO

Crear fuentes administrables.

Campos:

Nombre

URL del sitio

URL de búsqueda

URL RSS/Atom

Confianza

Prioridad

Estado

Método de integración

Última sincronización

⸻

20. FUENTES INICIALES

Preparar el sistema para fuentes como:

JKAnime

AnimeFLV

Anime Online

AnimeAV1

TioAnime

AnimeYT

AnimeGG

AnimeID

AnimeFenix

MonosChinos

AnimeWorld

AnimeBox

AnimeLatino

VerAnime

AnimeUltra

AnimeBlix

AnimeSuge

HiAnime

AniWave

Gogoanime

IMPORTANTE:

No asumir que todos estos servicios están activos.

No codificar las URLs directamente en el frontend.

Deben administrarse desde la base de datos.

⸻

21. FUENTES DE NOTICIAS

Crear otro sistema para fuentes de información.

Permitir:

RSS
Atom
APIs
Fuentes oficiales

Agregar inicialmente fuentes como:

Anime News Network

MyAnimeList News

Crunchyroll News

Anime Corner

Anime Herald

Anime Trending

Anime UK News

Tokyo Otaku Mode

Anime Expo

El administrador podrá añadir más.

⸻

22. SINCRONIZACIÓN AUTOMÁTICA

Crear un scheduler REAL en backend.

Frecuencia:

Cada 5 horas.

Debe funcionar aunque ningún usuario tenga la aplicación abierta.

No utilizar setInterval del frontend.

Cada ejecución debe:

Consultar fuentes.

Leer feeds.

Obtener información.

Detectar nuevos animes.

Detectar nuevos episodios.

Comparar información.

Actualizar base de datos.

Registrar cambios.

⸻

23. SISTEMA DE PRIORIDADES

Cada fuente tendrá una confianza:

Alta
Media
Baja

Y prioridad numérica.

Cuando existan datos contradictorios:

Priorizar fuentes de mayor confianza.

Nunca sobrescribir silenciosamente información confirmada.

Registrar cambios.

⸻

24. ANIList

AniList puede utilizarse como fuente complementaria.

NO convertir AniList en una dependencia obligatoria.

Si devuelve:

403

NO intentar evadir el bloqueo.

Marcar:

No disponible

y continuar con las demás fuentes.

No realizar reintentos infinitos.

⸻

25. JIKAN

Jikan también será opcional.

Si devuelve:

504

realizar pocos reintentos controlados.

Utilizar timeout.

Utilizar backoff.

Si continúa fallando:

marcar como temporalmente no disponible.

Continuar con las demás fuentes.

⸻

26. FALLBACK

Ejemplo:

AniList: error
Jikan: error
ANN: correcto
Crunchyroll News: correcto
Anime Corner: correcto

La sincronización debe continuar.

El resultado será:

Sincronización parcial

No mostrar:

“Error total”

si realmente se procesaron otras fuentes.

⸻

27. DETECCIÓN DE DUPLICADOS

Utilizar:

Título
Título japonés
Título inglés
Alias
Romanización
Año
Temporada
IDs externos

Ejemplo:

Mushoku Tensei III

Mushoku Tensei Season 3

Mushoku Tensei 3rd Season

No deben crear tres registros si representan el mismo anime.

⸻

28. NUEVOS EPISODIOS

Si anteriormente existía:

Episodio 8

y ahora aparece:

Episodio 9

actualizar automáticamente.

Registrar:

Anime
Episodio anterior
Nuevo episodio
Fuente
Fecha
Hora

⸻

29. HISTORIAL

Guardar todos los cambios importantes.

Ejemplo:

Fecha de estreno modificada.

Episodio nuevo.

Estado modificado.

Nueva fuente.

Fuente eliminada.

Guardar:

valor anterior
valor nuevo
fuente
fecha
hora

⸻

30. GUARDADOS

Crear sistema de guardados.

El usuario puede guardar un anime desde:

Nuevos
Videos
Detalles

Mostrarlo en:

Guardados

Ordenar por próximo estreno.

⸻

31. CONTINUAR VIENDO

Guardar:

Anime
Episodio
Fuente
Fecha de acceso

Mostrar:

Continuar viendo

Si no se puede obtener progreso real del reproductor externo:

guardar al menos el último episodio abierto.

⸻

32. BÚSQUEDA

Crear búsqueda global rápida.

Debe funcionar con:

Nombre
Alias
Título japonés
Título inglés

Agregar debounce.

Mostrar resultados mientras escribe.

No realizar consultas innecesarias.

⸻

33. FILTROS

Permitir:

Año

Temporada

Género

Estado

Nuevos episodios

Próximos estrenos

⸻

34. CONFIGURACIÓN

Crear una pantalla limpia estilo Settings de iOS.

Secciones:

Apariencia

Zona horaria

Notificaciones

Preferencias

Datos

Información

Mostrar:

Zona horaria detectada.

Última sincronización.

Estado de fuentes.

Versión de la aplicación.

⸻

35. TEMA

Permitir:

Oscuro

Negro puro

Automático

Las transiciones de tema deben ser suaves.

⸻

36. NOTIFICACIONES

Preparar sistema de notificaciones.

Notificar:

Nuevo episodio.

Nuevo anime.

Cambio de fecha.

Retraso.

Próximo estreno.

Permitir desactivarlas.

⸻

37. PANEL ADMINISTRATIVO

Crear un panel separado y protegido.

Ruta:

/admin

No mostrar ningún botón visible hacia /admin dentro de la aplicación pública.

No colocar enlaces públicos hacia administración.

La ruta debe requerir autenticación.

Utilizar autenticación segura del backend.

Crear el usuario administrador mediante el sistema de autenticación y variables seguras.

No escribir la contraseña directamente en código, frontend, GitHub ni archivos públicos.

El correo administrador será:

mayil.ramos.kv@gmail.com

La contraseña inicial debe configurarse como secreto seguro en el sistema de autenticación, no como texto dentro del código.

Obligatorio permitir cambiar la contraseña posteriormente.

⸻

38. ADMIN DASHBOARD

Al entrar a /admin mostrar:

Resumen

Animes totales

Episodios totales

Animes nuevos

Episodios nuevos

Fuentes activas

Fuentes con errores

Última sincronización

Próxima sincronización

⸻

39. ADMIN — ANIMES

Permitir:

Buscar anime.

Ver información.

Editar.

Eliminar.

Ocultar.

Restaurar.

Ver fuentes.

Ver episodios.

Ver historial.

⸻

40. ADMIN — EPISODIOS

Mostrar:

Anime
Episodio
Fecha
Fuentes
Estado
Última actualización

Permitir revisar y corregir información cuando sea necesario.

⸻

41. ADMIN — FUENTES

Crear:

Fuentes de información

y:

Fuentes de videos

Separadas.

Cada fuente debe mostrar:

Nombre

URL

Estado

Confianza

Prioridad

Última comprobación

Último error

Tiempo de respuesta

Elementos encontrados

Acciones:

Editar

Activar

Desactivar

Probar

Sincronizar

Eliminar

⸻

42. AGREGAR FUENTE

Crear formulario:

Nombre

URL del sitio

URL del feed RSS/Atom

Confianza

Prioridad

Tipo

Al guardar:

comprobar que la URL sea válida.

Comprobar el feed si existe.

Mostrar resultado.

No guardar silenciosamente una fuente rota.

⸻

43. ADMIN — SINCRONIZACIÓN

Botón:

Sincronizar ahora

Mostrar progreso en tiempo real.

Estados:

Preparando

Consultando fuentes

Procesando feeds

Analizando títulos

Comparando datos

Detectando episodios

Actualizando base de datos

Finalizando

⸻

44. LOG DE SINCRONIZACIÓN

Guardar cada ejecución.

Mostrar:

ID

Fecha

Hora

Duración

Fuentes

Éxitos

Errores

Animes encontrados

Animes nuevos

Episodios nuevos

Cambios

⸻

45. ERRORES

Crear pantalla:

Errores

Mostrar:

Fuente

Código

Mensaje

Fecha

Cantidad de ocurrencias

Última aparición

Estado

Permitir marcar como revisado.

⸻

46. FUENTE CAÍDA

Si una fuente falla repetidamente:

marcar:

Problemas

No eliminarla.

No detener el sistema.

Intentar nuevamente durante futuras sincronizaciones.

⸻

47. DISEÑO DEL ADMIN

El panel también debe ser profesional.

Desktop:

Sidebar lateral.

Mobile:

Menú lateral deslizable.

Usar el mismo lenguaje visual:

oscuro
glass
blur
minimalista

Pero darle una apariencia más administrativa.

⸻

48. RESPONSIVE

La aplicación debe funcionar perfectamente en:

iPhone

iPad

Android

Desktop

No permitir:

overflow horizontal

elementos cortados

botones fuera de pantalla

texto superpuesto

⸻

49. FLUIDEZ

Priorizar 60 FPS siempre que sea posible.

No ejecutar procesos pesados en el frontend.

La sincronización debe ejecutarse en backend.

Utilizar caché.

Utilizar paginación.

Utilizar lazy loading.

Optimizar imágenes.

No renderizar miles de elementos simultáneamente.

⸻

50. TRANSICIONES

La navegación entre:

Nuevos
Videos
Guardados
Configuración

debe sentirse instantánea.

Utilizar animaciones cortas.

No utilizar loaders innecesarios cuando la información ya está almacenada en caché.

⸻

51. ESTADOS VACÍOS

Crear estados vacíos elegantes.

Ejemplo:

No hay animes guardados.

No hay nuevos episodios.

No hay fuentes disponibles.

No hay resultados.

Nunca dejar una pantalla completamente vacía.

⸻

52. OFFLINE / CONEXIÓN

Si el usuario pierde conexión:

mostrar estado:

Sin conexión

Pero permitir visualizar información previamente almacenada cuando sea posible.

Cuando vuelva Internet:

actualizar automáticamente.

⸻

53. SEGURIDAD

Implementar:

Autenticación segura.

Autorización por roles.

Validación de inputs.

Protección de endpoints.

Rate limiting.

Variables de entorno.

Secrets.

Logs.

No exponer credenciales.

No permitir que usuarios normales accedan a funciones administrativas.

⸻

54. PRIVACIDAD

No almacenar información innecesaria.

Los guardados pueden almacenarse localmente o asociados a una cuenta según la arquitectura.

No recopilar información innecesaria del usuario.

⸻

55. REGLAS PARA FUENTES EXTERNAS

La aplicación debe actuar como agregador.

No:

Descargar videos.

Copiar videos.

Alojar videos.

Redistribuir videos.

Extraer streams protegidos.

Evitar DRM.

Evitar CAPTCHA.

Evitar bloqueos.

Evitar límites de acceso.

Si una página no permite automatización:

marcarla como no compatible.

⸻

56. PRUEBA REAL

Al terminar la implementación:

NO decir que funciona solamente porque el código compila.

Realizar pruebas reales.

Comprobar:

Frontend.

Backend.

Base de datos.

Autenticación.

Admin.

Sincronización.

Fuentes.

Búsqueda.

Guardados.

Videos.

Episodios.

Errores.

Responsive.

⸻

57. PRIMERA SINCRONIZACIÓN

Ejecutar una sincronización manual real.

Comprobar:

Cuántas fuentes respondieron.

Cuántas fallaron.

Cuántos animes se encontraron.

Cuántos animes nuevos.

Cuántos episodios nuevos.

Cuántos duplicados fueron fusionados.

⸻

58. SCHEDULER

Comprobar que el scheduler de 5 horas realmente quedó configurado en backend.

No utilizar:

setInterval()

en el navegador como sistema principal.

La ejecución debe funcionar con la aplicación cerrada.

Mostrar en administración:

Última sincronización

Próxima sincronización

⸻

59. RESULTADO FINAL

Quiero que el resultado final sea una aplicación que se sienta como un producto real.

Debe ser:

Rápida.

Fluida.

Elegante.

Minimalista.

Profesional.

Responsive.

Automática.

Escalable.

No quiero una simple página que muestre una lista de anime.

Quiero un sistema completo.

El flujo principal debe ser:

Nuevos
→ descubrir anime
→ abrir detalles
→ guardar
→ recibir actualización
→ entrar en Videos
→ encontrar episodio
→ elegir fuente externa
→ abrir episodio

Mientras el usuario no hace nada, el backend continúa:

Cada 5 horas
→ consultar fuentes
→ detectar cambios
→ actualizar información
→ detectar nuevos episodios
→ actualizar Videos
→ actualizar Guardados
→ registrar historial

⸻

60. CONDICIÓN FINAL

NO utilizar información ficticia.

NO simular APIs.

NO crear sincronizaciones falsas.

NO colocar resultados estáticos.

NO depender de AniList.

NO depender de Jikan.

NO permitir que una fuente caída rompa la aplicación.

NO guardar credenciales en el código.

NO exponer /admin públicamente dentro de la navegación.

Construir todo desde cero y dejar la arquitectura preparada para agregar nuevas fuentes en el futuro sin tener que modificar todo el sistema.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://next-episode-navigator.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e38a5c59-d913-4d7f-950b-098aa7fb3250).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
