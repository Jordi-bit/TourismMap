# TourismMap

Aplicación de escritorio interactiva para organizar y visualizar tus fotos y vídeos de viajes sobre un mapa.

## Características

- **Mapas interactivos**: Vista 2D y 3D con imágenes satelitales de alta resolución
- **Gestión de medios**: Sube fotos y vídeos organizados por ubicación, año y mes
- **Ubicaciones geográficas**: Asigna coordenadas a tus medios para verlos en el mapa
- **Sistema de favoritos**: Guarda tus ubicaciones preferidas
- **Barra lateral informativa**: Información detallada de cada ubicación
- **Búsqueda**: Encuentra ubicaciones por nombre o provincia
- **Modo oscuro**: Interfaz en modo oscuro para mayor comodidad

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
├── server/
│   └── server.js        # Servidor Express para API
├── public/
│   ├── index.html       # Interfaz de usuario
│   ├── app.js           # Lógica del frontend
│   └── style.css        # Estilos
├── media/
│   └── images/          # Almacenamiento de imágenes
├── dist/                # Ejecutables generados
└── package.json
```

## Uso de la aplicación

1. **Añadir ubicación**: Haz clic en el mapa y usa el formulario para crear una nueva ubicación
2. **Subir medios**: Selecciona una ubicación y usa los botones de subida para agregar fotos/vídeos
3. **Ver medios**: Expande los años y meses en la galería para ver tu contenido
4. **Ver en mapa**: Usa el botón de previsualización para ver los medios en el mapa
5. **Eliminar**: Puedes eliminar medios individuales, meses completos o ubicaciones enteras
6. **Editar fechas**: Usa el botón de edición (lápiz) para cambiar el año de un grupo o el mes y año de un mes concreto
7. **Modo 2D/3D**: Cambia entre vistas 2D y 3D. Los botones de capas (Geo, Vías, Ríos) solo están disponibles en modo 2D

## Capas del mapa

- **Vista 2D**: Disponible con satélite y etiquetas. Soporta capas de límites geopolíticos, carreteras y ríos/lagos
- **Vista 3D**: Terreno con relieve. Las capas Geo, Vías y Ríos se deshabilitan automáticamente

## Almacenamiento de datos

Los datos se guardan en la carpeta de datos locales de usuario:

```
%LOCALAPPDATA%\TourismMap\
├── server/
│   └── database.json    # Base de datos con ubicaciones y referencias a medios
├── images/
│   └── [municipio]/     # Imágenes organizadas por ubicación
└── videos/
    └── [municipio]/     # Vídeos organizados por ubicación
```

### Transferir datos a otro PC

Para llevar tus datos a otro ordenador:

1. Copia la carpeta `%LOCALAPPDATA%\TourismMap\` completa
2. Pégala en la misma ubicación del otro PC
3. Instala el programa

Todos tus medios, ubicaciones y favoritos se restaurarán automáticamente.

## Tecnologías

- Electron
- Express.js
- Leaflet / MapLibre GL
- Multer

---

*Explora el mundo y guarda tus recuerdos.*
