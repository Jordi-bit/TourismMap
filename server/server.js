const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const cors = require('cors');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');

// Set ffmpeg path
try {
    ffmpeg.setFfmpegPath(ffmpegStatic);
} catch (e) {}

const app = express();
const PORT = process.env.PORT || 3000;

// Path Logic for Standalone App
const isPackaged = process.env.IS_ELECTRON_PACKAGED === 'true';

let BASE_PATH;
let UPLOAD_PATH;

if (isPackaged) {
    // Get resources path from environment
    const resourcesPath = process.env.APP_RESOURCES_PATH;
    
    // Check if media and database exist in resources folder (NSIS installer)
    const mediaPath = path.join(resourcesPath, 'media');
    const dbFile = path.join(resourcesPath, 'server', 'database.json');
    
    if (fs.existsSync(mediaPath) && fs.existsSync(dbFile)) {
        BASE_PATH = resourcesPath;
    } else {
        // Fallback to exe directory (portable version)
        BASE_PATH = path.dirname(process.execPath);
    }
    
    // For uploads, use user data folder (AppData) - user has write permissions there
    // This is critical for installed apps in Program Files
    const userDataPath = process.env.USERPROFILE 
        ? path.join(process.env.USERPROFILE, 'AppData', 'Local', 'TourismMap')
        : path.join(BASE_PATH, 'media');
    
    UPLOAD_PATH = userDataPath;
    
    // Ensure upload directory exists
    if (!fs.existsSync(UPLOAD_PATH)) {
        fs.mkdirSync(UPLOAD_PATH, { recursive: true });
    }
} else {
    BASE_PATH = path.join(__dirname, '..');
    UPLOAD_PATH = path.join(BASE_PATH, 'media');
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// CORS headers for media files
app.use('/media', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
}, express.static(UPLOAD_PATH, {
    setHeaders: (res, filePath) => {
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes = {
            '.mp4': 'video/mp4',
            '.webm': 'video/webm',
            '.mov': 'video/quicktime',
            '.avi': 'video/x-msvideo',
            '.mkv': 'video/x-matroska',
            '.wmv': 'video/x-ms-wmv',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp'
        };
        if (mimeTypes[ext]) {
            res.set('Content-Type', mimeTypes[ext]);
        }
    }
}));
app.use('/media', express.static(path.join(BASE_PATH, 'media'), {
    setHeaders: (res, filePath) => {
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes = {
            '.mp4': 'video/mp4',
            '.webm': 'video/webm',
            '.mov': 'video/quicktime',
            '.avi': 'video/x-msvideo',
            '.mkv': 'video/x-matroska',
            '.wmv': 'video/x-ms-wmv',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp'
        };
        if (mimeTypes[ext]) {
            res.set('Content-Type', mimeTypes[ext]);
        }
    }
}));

// --- JSON Database Setup ---
const dbPath = path.join(BASE_PATH, 'server', 'database.json');

class JsonDatabase {
    constructor(filePath) {
        this.filePath = filePath;
        this.data = {
            towns: [],
            media: [],
            favorites: []
        };
        this.init();
    }

    init() {
        const dir = path.dirname(this.filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        if (fs.existsSync(this.filePath)) {
            try {
                const content = fs.readFileSync(this.filePath, 'utf8');
                this.data = JSON.parse(content);
            } catch (err) {
                console.error('Error loading database.json:', err);
            }
        } else {
            this.save();
            this.seedTowns();
        }
    }

    save() {
        fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
    }

    seedTowns() {
        const townsPath = path.join(__dirname, '../data/towns.json');
        if (fs.existsSync(townsPath)) {
            const townsData = JSON.parse(fs.readFileSync(townsPath, 'utf8'));
            this.data.towns = townsData;
            this.save();
        }
    }
}

const db = new JsonDatabase(dbPath);

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const town = req.body.town;
        if (!town) {
            return cb(new Error('Town is required but missing from request body.'));
        }
        
        // Determine type based on mimetype or original filename extension
        let type;
        if (file.mimetype.startsWith('image/')) {
            type = 'images';
        } else if (file.mimetype.startsWith('video/')) {
            type = 'videos';
        } else {
            // Fallback: check file extension
            const ext = path.extname(file.originalname).toLowerCase();
            if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(ext)) {
                type = 'images';
            } else if (['.mp4', '.webm', '.mov', '.avi', '.mkv', '.wmv'].includes(ext)) {
                type = 'videos';
            } else {
                // Default to videos if unknown
                type = 'videos';
            }
        }
        
        const dir = path.join(UPLOAD_PATH, type, town);
        
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 500 * 1024 * 1024 } // 500MB limit
});

// --- Endpoints ---

// GET /towns
app.get('/api/towns', (req, res) => {
    res.json(db.data.towns);
});

// POST /towns
app.post('/api/towns', (req, res) => {
    let { name, latitude, longitude, description, province } = req.body;
    
    // Fallback if empty
    if (!name || name.trim() === '') {
        name = `Ubicación Nueva ${Date.now()}`;
    }
    if (!province) province = 'Desconocida';
    if (!description) description = '';

    if (!latitude || !longitude) {
        return res.status(400).json({ error: 'Missing Town coordinates' });
    }

    if (db.data.towns.find(t => t.name === name)) {
        return res.status(400).json({ error: 'A town with this name already exists' });
    }

    const newTown = { name, latitude, longitude, description, province };
    db.data.towns.push(newTown);
    db.save();
    res.json(newTown);
});

// DELETE /towns/:name
app.delete('/api/towns/:name', (req, res) => {
    const { name } = req.params;
    
    // First, get all media records to delete files
    const mediaToDelete = db.data.media.filter(m => m.town === name);
    
    mediaToDelete.forEach(m => {
        // Try UPLOAD_PATH first (AppData), then BASE_PATH (resources)
        const uploadMediaPath = path.join(UPLOAD_PATH, m.file_path.replace('/media/', ''));
        const baseMediaPath = path.join(BASE_PATH, m.file_path);
        
        let fullPath = uploadMediaPath;
        if (!fs.existsSync(uploadMediaPath) && fs.existsSync(baseMediaPath)) {
            fullPath = baseMediaPath;
        }
        
        try {
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
            }
        } catch (err) {
            console.error(`Error deleting file ${fullPath}:`, err);
        }
    });

    // Also delete the media folders recursively to be sure (check both paths)
    const imgDirUpload = path.join(UPLOAD_PATH, 'images', name);
    const vidDirUpload = path.join(UPLOAD_PATH, 'videos', name);
    const imgDirBase = path.join(BASE_PATH, 'media', 'images', name);
    const vidDirBase = path.join(BASE_PATH, 'media', 'videos', name);
    
    try {
        if (fs.existsSync(imgDirUpload)) fs.rmSync(imgDirUpload, { recursive: true, force: true });
        if (fs.existsSync(vidDirUpload)) fs.rmSync(vidDirUpload, { recursive: true, force: true });
        if (fs.existsSync(imgDirBase)) fs.rmSync(imgDirBase, { recursive: true, force: true });
        if (fs.existsSync(vidDirBase)) fs.rmSync(vidDirBase, { recursive: true, force: true });
    } catch (fsErr) {
        console.error('Error deleting folders:', fsErr);
    }

    // Delete from Data
    db.data.towns = db.data.towns.filter(t => t.name !== name);
    db.data.media = db.data.media.filter(m => m.town !== name);
    db.data.favorites = db.data.favorites.filter(f => f !== name);
    db.save();
    
    res.json({ message: `Ubicación ${name} y todos sus archivos eliminados correctamente.` });
});

// PUT /towns/:oldName
app.put('/api/towns/:oldName', (req, res) => {
    const { oldName } = req.params;
    let { name, latitude, longitude, description, province } = req.body;

    if (!latitude || !longitude) {
        return res.status(400).json({ error: 'Missing coordinates' });
    }
    
    if (!name || name.trim() === '') name = oldName;
    if (!province) province = 'Desconocida';

    const townIndex = db.data.towns.findIndex(t => t.name === oldName);
    if (townIndex === -1) return res.status(404).json({ error: 'Town not found' });

    const nameChanged = oldName !== name;
    if (nameChanged && db.data.towns.find(t => t.name === name)) {
        return res.status(400).json({ error: 'A town with the new name already exists' });
    }

    // Update Town
    db.data.towns[townIndex] = { name, latitude, longitude, description, province };

    if (nameChanged) {
        // Update Media references
        db.data.media = db.data.media.map(m => {
            if (m.town === oldName) {
                return {
                    ...m,
                    town: name,
                    file_path: m.file_path.replace(`/images/${oldName}/`, `/images/${name}/`).replace(`/videos/${oldName}/`, `/videos/${name}/`)
                };
            }
            return m;
        });
        
        // Update Favorites
        db.data.favorites = db.data.favorites.map(f => (f === oldName ? name : f));

        // Rename Folders (check both paths)
        const oldImgDirUpload = path.join(UPLOAD_PATH, 'images', oldName);
        const newImgDirUpload = path.join(UPLOAD_PATH, 'images', name);
        const oldVidDirUpload = path.join(UPLOAD_PATH, 'videos', oldName);
        const newVidDirUpload = path.join(UPLOAD_PATH, 'videos', name);
        
        const oldImgDirBase = path.join(BASE_PATH, 'media', 'images', oldName);
        const newImgDirBase = path.join(BASE_PATH, 'media', 'images', name);
        const oldVidDirBase = path.join(BASE_PATH, 'media', 'videos', oldName);
        const newVidDirBase = path.join(BASE_PATH, 'media', 'videos', name);

        try {
            if (fs.existsSync(oldImgDirUpload)) fs.renameSync(oldImgDirUpload, newImgDirUpload);
            if (fs.existsSync(oldVidDirUpload)) fs.renameSync(oldVidDirUpload, newVidDirUpload);
            if (fs.existsSync(oldImgDirBase)) fs.renameSync(oldImgDirBase, newImgDirBase);
            if (fs.existsSync(oldVidDirBase)) fs.renameSync(oldVidDirBase, newVidDirBase);
        } catch (fsErr) {
            console.error('Error renaming folders:', fsErr);
        }
    }

    db.save();
    res.json({ message: 'Town updated successfully', town: db.data.towns[townIndex] });
});

// GET /media/:town
app.get('/api/media/:town', (req, res) => {
    const { town } = req.params;
    res.json(db.data.media.filter(m => m.town === town));
});

// POST /upload/image
app.post('/api/upload/image', upload.single('image'), (req, res) => {
    const { town } = req.body;
    const month = parseInt(req.body.month);
    const year = parseInt(req.body.year);

    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const filePath = `/media/images/${town}/${req.file.filename}`;
    const newMedia = {
        id: Date.now(),
        town,
        file_path: filePath,
        type: 'image',
        month,
        year,
        upload_date: new Date().toISOString()
    };
    
    db.data.media.push(newMedia);
    db.save();
    res.json(newMedia);
});

// POST /upload/video
app.post('/api/upload/video', upload.single('video'), (req, res) => {
    const { town } = req.body;
    const month = parseInt(req.body.month);
    const year = parseInt(req.body.year);

    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const filePath = `/media/videos/${town}/${req.file.filename}`;
    const videoFullPath = req.file.path;
    const thumbnailFilename = req.file.filename.replace(/\.[^/.]+$/, '') + '_thumb.jpg';
    const thumbnailPath = path.join(path.dirname(videoFullPath), thumbnailFilename);
    const thumbnailUrl = filePath.replace(/\.[^/.]+$/, '') + '_thumb.jpg';

    // Generate thumbnail using ffmpeg
    ffmpeg(videoFullPath)
        .screenshots({
            timestamps: ['00:00:01'],
            filename: thumbnailFilename,
            folder: path.dirname(videoFullPath),
            size: '120x90'
        })
        .on('end', () => {
        })
        .on('error', (err) => {
            // Thumbnail generation failed, but continue anyway
        });

    const newMedia = {
        id: Date.now(),
        town,
        file_path: filePath,
        thumbnail_path: thumbnailUrl,
        type: 'video',
        month,
        year,
        upload_date: new Date().toISOString()
    };
    
    db.data.media.push(newMedia);
    db.save();
    res.json(newMedia);
});

// POST /api/media/:id/generate-thumbnail
app.post('/api/media/:id/generate-thumbnail', (req, res) => {
    const id = parseInt(req.params.id);
    const mediaItem = db.data.media.find(m => m.id === id);
    
    if (!mediaItem) {
        return res.status(404).json({ error: 'Media not found' });
    }
    
    if (mediaItem.type !== 'video') {
        return res.status(400).json({ error: 'Not a video' });
    }
    
    if (mediaItem.thumbnail_path) {
        return res.json({ thumbnail_path: mediaItem.thumbnail_path });
    }
    
    // Get full path to video file
    let videoFullPath;
    const uploadVideoPath = path.join(UPLOAD_PATH, mediaItem.file_path.replace('/media/', ''));
    const baseVideoPath = path.join(BASE_PATH, mediaItem.file_path.replace('/media/', ''));
    
    if (fs.existsSync(uploadVideoPath)) {
        videoFullPath = uploadVideoPath;
    } else if (fs.existsSync(baseVideoPath)) {
        videoFullPath = baseVideoPath;
    } else {
        return res.status(404).json({ error: 'Video file not found' });
    }
    
    const thumbnailFilename = path.basename(videoFullPath).replace(/\.[^/.]+$/, '') + '_thumb.jpg';
    const thumbnailPath = path.join(path.dirname(videoFullPath), thumbnailFilename);
    const thumbnailUrl = mediaItem.file_path.replace(/\.[^/.]+$/, '') + '_thumb.jpg';
    
    // Check if thumbnail already exists
    if (fs.existsSync(thumbnailPath)) {
        mediaItem.thumbnail_path = thumbnailUrl;
        db.save();
        return res.json({ thumbnail_path: thumbnailUrl });
    }
    
    // Try to generate thumbnail with ffmpeg
    try {
        ffmpeg(videoFullPath)
            .screenshots({
                timestamps: ['00:00:01'],
                filename: thumbnailFilename,
                folder: path.dirname(videoFullPath),
                size: '120x90'
            })
            .on('end', () => {
                if (fs.existsSync(thumbnailPath)) {
                    mediaItem.thumbnail_path = thumbnailUrl;
                    db.save();
                }
            })
            .on('error', () => {});
    } catch (e) {}
    
    // Return immediately
    res.json({ thumbnail_path: thumbnailUrl, generating: true });
});

// DELETE /api/media/town/:town/year/:year/month/:month
app.delete('/api/media/town/:town/year/:year/month/:month', (req, res) => {
    const { town, year, month } = req.params;
    const y = parseInt(year);
    const m = parseInt(month);

    const mediaToDelete = db.data.media.filter(
        item => item.town === town && Number(item.year) === y && Number(item.month) === m
    );

    mediaToDelete.forEach(item => {
        // Try UPLOAD_PATH first, then BASE_PATH
        const uploadMediaPath = path.join(UPLOAD_PATH, item.file_path.replace('/media/', ''));
        const baseMediaPath = path.join(BASE_PATH, item.file_path);
        
        let fullPath = uploadMediaPath;
        if (!fs.existsSync(uploadMediaPath) && fs.existsSync(baseMediaPath)) {
            fullPath = baseMediaPath;
        }
        
        try {
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
            }
        } catch (err) {
        }
    });

    db.data.media = db.data.media.filter(
        item => !(item.town === town && Number(item.year) === y && Number(item.month) === m)
    );
    db.save();

    res.json({ message: `Deleted ${mediaToDelete.length} items from ${town} for ${month}/${year}` });
});

// DELETE /media/:id
app.delete('/api/media/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const mediaItem = db.data.media.find(m => m.id === id);
    if (!mediaItem) return res.status(404).json({ error: 'Media not found' });

    // Try UPLOAD_PATH first (AppData), then BASE_PATH (resources)
    const uploadMediaPath = path.join(UPLOAD_PATH, mediaItem.file_path.replace('/media/', ''));
    const baseMediaPath = path.join(BASE_PATH, mediaItem.file_path);
    
    let fullPath = uploadMediaPath;
    if (!fs.existsSync(uploadMediaPath) && fs.existsSync(baseMediaPath)) {
        fullPath = baseMediaPath;
    }
    
    if (fs.existsSync(fullPath)) {
        try {
            fs.unlinkSync(fullPath);
        } catch (err) {
        }
    }

    db.data.media = db.data.media.filter(m => m.id !== id);
    db.save();
    res.json({ message: 'Media deleted successfully' });
});

// PUT /api/media/:id/location
app.put('/api/media/:id/location', (req, res) => {
    const id = parseInt(req.params.id);
    const { latitude, longitude } = req.body;

    if (latitude === undefined || longitude === undefined) {
        return res.status(400).json({ error: 'Missing latitude or longitude' });
    }

    const index = db.data.media.findIndex(m => m.id === id);
    if (index === -1) return res.status(404).json({ error: 'Media not found' });

    db.data.media[index].latitude = latitude;
    db.data.media[index].longitude = longitude;
    db.save();
    res.json(db.data.media[index]);
});

// DELETE /api/media/:id/location
app.delete('/api/media/:id/location', (req, res) => {
    const id = parseInt(req.params.id);
    const index = db.data.media.findIndex(m => m.id === id);
    if (index === -1) return res.status(404).json({ error: 'Media not found' });

    db.data.media[index].latitude = null;
    db.data.media[index].longitude = null;
    db.save();
    res.json({ id, message: 'Location removed successfully' });
});

// GET /favorites
app.get('/api/favorites', (req, res) => {
    res.json(db.data.favorites);
});

// POST /favorites/toggle
app.post('/api/favorites/toggle', (req, res) => {
    const { town } = req.body;
    const index = db.data.favorites.indexOf(town);
    if (index > -1) {
        db.data.favorites.splice(index, 1);
        db.save();
        res.json({ favorite: false });
    } else {
        db.data.favorites.push(town);
        db.save();
        res.json({ favorite: true });
    }
});

// Start Server - Export promise for main.js to wait on
let serverInstance = null;

function startServer() {
    return new Promise((resolve, reject) => {
        serverInstance = app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
            resolve(serverInstance);
        });
        serverInstance.on('error', (err) => {
            console.error('Server error:', err);
            reject(err);
        });
    });
}

module.exports = { startServer };
