# TourismMap

Aplicación de escritorio interactiva para organizar y visualizar tus fotos y vídeos de viajes sobre un mapa.

## Características

- **Mapas interactivos**: Vista 2D y 3D con imágenes satelitales de alta resolución
- **Gestión de medios**: Sube fotos y vídeos organizados por ubicación, año y mes
- **Extracción de geolocalización GPS**: Extrae automáticamente las coordenadas GPS de las fotos y crea marcadores en el mapa
- **Miniaturas de vídeo**: Genera fotogramas de previsualización para los vídeos
- **Sistema de favoritos**: Guarda tus ubicaciones preferidas
- **Barra lateral informativa**: Información detallada de cada ubicación
- **Búsqueda**: Encuentra ubicaciones por nombre o provincia
- **Modo oscuro**: Interfaz en modo oscuro para mayor comodidad
- **Previsualización en mapa**: Activa miniaturas de medios directamente en el mapa
- **Optimización de rendimiento**: Caché de tiles y controles de fluidez para el mapa

## Requisitos

- Node.js 18+
- npm 9+

## Instalación

1. Clona el repositorio:
```bash
git clone <url-del-repositorio>
cd tourism-map
```

2. Instala las dependencias:
```bash
npm install
```

## Uso

### Modo desarrollo

```bash
npm start
```

### Construir ejecutable

```bash
npm run build
```

El ejecutable se generará en la carpeta `dist/`.

## Estructura del proyecto

```
tourism-map/
├── main.js              # Punto de entrada de Electron
├── preload.js           # Script de preload para comunicación segura
├── server/
│   └── server.js        # Servidor Express para API
├── public/
│   ├── index.html       # Interfaz de usuario
│   ├── app.js           # Lógica del frontend
│   └── style.css        # Estilos
├── media/               # Almacenamiento de medios (imágenes y vídeos)
├── dist/                # Ejecutables generados
└── package.json
```

## Uso de la aplicación

### Gestión de ubicaciones

1. **Añadir ubicación**: Haz clic en el mapa y usa el formulario para crear una nueva ubicación
2. **Editar ubicación**: Modifica los datos desde la barra lateral
3. **Eliminar ubicación**: Borra ubicaciones completas con todas sus fotos y vídeos

### Gestión de medios

1. **Subir medios**: Selecciona una ubicación y usa los botones de subida para agregar fotos/vídeos
2. **Organización automática**: Los archivos se organizan por año y mes automáticamente
3. **Ver galería**: Expande los años y meses en la galería para ver tu contenido
4. **Eliminar medios**: Elimina archivos individuales, meses completos o años completos (filtrado por tipo)

### Geolocalización GPS

- **Extractor GPS**: Cada imagen subida muestra un botón de satélite en la esquina superior izquierda
- **Ubicación automática**: Al hacer clic en el botón, se extraen las coordenadas GPS de los metadatos EXIF
- **Creación de marcadores**: Si la imagen contiene datos GPS, se crea automáticamente un marcador en el mapa
- **Ubicación manual**: También puedes colocar marcadores manualmente haciendo clic en el mapa

### Eliminación de medios

- **Eliminar archivo individual**: Botón de papelera en cada imagen/vídeo (incluye thumbnail para vídeos)
- **Eliminar mes completo**: Elimina todas las fotos o vídeos de un mes específico
- **Eliminar año completo**: Elimina todas las fotos o vídeos de un año específico
- **Eliminar ubicación**: Borra la ubicación y todos sus medios asociados

### Edición de fechas

- **Editar año**: Cambia el año de un grupo de medios
- **Editar mes**: Modifica el mes y año de medios específicos

### Vistas del mapa

- **Vista 2D**: Vista aérea con satélite, etiquetas y transporte
- **Vista 3D**: Vista con relieve y terreno
- **Capas 2D**: Geo (límites geopolíticos), Vías (carreteras), Ríos (ríos y lagos)
- **Relieve 3D**: Activa/desactiva el relieve con el botón de montaña
- **Punteros**: Activa/desactiva los marcadores de medios en el mapa

### Optimización de rendimiento

- **Caché de tiles**: Los tiles del mapa se guardan en caché para mejorar la fluidez
- **Indicador de caché**: Botón de base de datos muestra la memoria de caché utilizada
- **Limpiar caché**: Permite liberar memoria limpiando los tiles en caché
- **Modo 3D optimizado**: El relieve y las capas 3D se pueden desactivar para mayor fluidez

### Previsualización en mapa

- **Miniaturas de vídeo**: Los vídeos muestran fotogramas de previsualización
- **Activar/desactivar**: Los botones de previsualización están activos por defecto
- **Ver en mapa**: Muestra miniaturas de los medios en el mapa

## Almacenamiento de datos

Los datos se guardan en la carpeta de datos locales de usuario:

```
%LOCALAPPDATA%\TourismMap\
├── server/
│   └── database.json    # Base de datos con ubicaciones y referencias a medios
├── images/
│   └── [municipio]/     # Imágenes organizadas por ubicación
├── videos/
│   └── [municipio]/     # Vídeos organizados por ubicación
└── temp/                # Archivos temporales
```

### Transferir datos a otro PC

Para llevar tus datos a otro ordenador:

1. Copia la carpeta `%LOCALAPPDATA%\TourismMap\` completa
2. Pégala en la misma ubicación del otro PC
3. Instala el programa

Todos tus medios, ubicaciones y favoritos se restaurarán automáticamente.

## Tecnologías

- **Electron**: Framework de aplicación de escritorio
- **Express.js**: Servidor backend
- **Leaflet**: Biblioteca de mapas 2D
- **MapLibre GL**: Biblioteca de mapas 3D
- **Multer**: Gestión de subida de archivos
- **Exifr**: Extracción de metadatos EXIF/GPS
- **FFmpeg**: Generación de miniaturas de vídeo

## Licencia

Este proyecto está bajo licencia MIT.

---

*Explora el mundo y guarda tus recuerdos.*
