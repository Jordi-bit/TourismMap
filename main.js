const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

app.disableHardwareAcceleration();

let mainWindow;

const isPackaged = app.isPackaged;
process.env.IS_ELECTRON_PACKAGED = isPackaged ? 'true' : 'false';

let basePath;
let resourcesPath;

if (isPackaged) {
    const exePath = path.dirname(app.getPath('exe'));
    resourcesPath = path.join(exePath, 'resources');
    
    const mediaInResources = path.join(resourcesPath, 'media');
    const dbInResources = path.join(resourcesPath, 'server', 'database.json');
    
    if (fs.existsSync(mediaInResources) || fs.existsSync(dbInResources)) {
        basePath = resourcesPath;
    } else {
        basePath = exePath;
        resourcesPath = exePath;
    }
    
    process.env.APP_RESOURCES_PATH = resourcesPath;
} else {
    basePath = __dirname;
    resourcesPath = __dirname;
}

process.env.BASE_PATH = basePath;
process.env.PORT = '3000';

async function startApp() {
    try {
        const serverModule = require('./server/server.js');
        await serverModule.startServer();
        createWindow();
    } catch (err) {
        createWindow();
    }
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        show: false,
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            spellcheck: false,
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: false
        }
    });

    ipcMain.handle('open-with-photos', async (event, filePath) => {
        const { exec } = require('child_process');
        
        try {
            let resourcesPath;
            
            if (app.isPackaged) {
                const exePath = path.dirname(app.getPath('exe'));
                resourcesPath = path.join(exePath, 'resources');
                
                if (!fs.existsSync(path.join(resourcesPath, 'media'))) {
                    resourcesPath = exePath;
                }
            } else {
                resourcesPath = __dirname;
            }
            
            let fullPath = null;
            
            // File path from DB is like: /media/videos/town/filename.mp4
            // Server stores files at: AppData\Local\TourismMap\videos\town\filename.mp4
            // So we replace /media/ with nothing
            
            // 1. AppData path (where uploaded files are stored) - NO extra 'media' folder
            const appDataPath = path.join(process.env.USERPROFILE || '', 'AppData', 'Local', 'TourismMap', filePath.replace('/media/', ''));
            // 2. Resources path
            const resourcesMediaPath = path.join(resourcesPath, 'media', filePath.replace('/media/', ''));
            // 3. Portable path (next to exe)
            const portableMediaPath = path.join(path.dirname(app.getPath('exe')), 'media', filePath.replace('/media/', ''));
            
            if (fs.existsSync(appDataPath)) {
                fullPath = appDataPath;
            } else if (fs.existsSync(resourcesMediaPath)) {
                fullPath = resourcesMediaPath;
            } else if (fs.existsSync(portableMediaPath)) {
                fullPath = portableMediaPath;
            }
            
            if (!fullPath) {
                // Try with development path
                const devPath = path.join(__dirname, 'media', filePath.replace('/media/', ''));
                if (fs.existsSync(devPath)) {
                    fullPath = devPath;
                }
            }
            
            if (!fullPath) {
                return { success: false, error: 'File not found' };
            }
            
            const folderPath = path.dirname(fullPath);
            
            const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
            let files = [];
            
            if (fs.existsSync(folderPath)) {
                files = fs.readdirSync(folderPath)
                    .filter(f => imageExtensions.includes(path.extname(f).toLowerCase()))
                    .map(f => path.join(folderPath, f));
            }
            
            await shell.openPath(fullPath);
            
            if (files.length > 1) {
                setTimeout(() => {
                    exec('taskkill /F /IM Microsoft.Photos.exe', { windowsHide: true });
                    setTimeout(() => {
                        exec(`start "" "${fullPath}"`, { windowsHide: true });
                    }, 500);
                }, 1000);
            }
            
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('open-external-file', async (event, filePath) => {
        try {
            let resourcesPath;
            
            if (app.isPackaged) {
                const exePath = path.dirname(app.getPath('exe'));
                resourcesPath = path.join(exePath, 'resources');
                
                if (!fs.existsSync(path.join(resourcesPath, 'media'))) {
                    resourcesPath = exePath;
                }
            } else {
                resourcesPath = __dirname;
            }
            
            let fullPath = null;
            
            const appDataPath = path.join(process.env.USERPROFILE || '', 'AppData', 'Local', 'TourismMap', filePath.replace('/media/', ''));
            const resourcesMediaPath = path.join(resourcesPath, 'media', filePath.replace('/media/', ''));
            const portableMediaPath = path.join(path.dirname(app.getPath('exe')), 'media', filePath.replace('/media/', ''));
            
            if (fs.existsSync(appDataPath)) {
                fullPath = appDataPath;
            } else if (fs.existsSync(resourcesMediaPath)) {
                fullPath = resourcesMediaPath;
            } else if (fs.existsSync(portableMediaPath)) {
                fullPath = portableMediaPath;
            }
            
            if (!fullPath) {
                const devPath = path.join(__dirname, 'media', filePath.replace('/media/', ''));
                if (fs.existsSync(devPath)) {
                    fullPath = devPath;
                }
            }
            
            if (!fullPath) {
                return { success: false, error: 'File not found' };
            }
            
            await shell.openPath(fullPath);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    const loadApp = () => {
        mainWindow.loadURL('http://127.0.0.1:3000').then(() => {
            mainWindow.show();
            mainWindow.focus();
            mainWindow.webContents.focus();
        }).catch(() => {
            setTimeout(loadApp, 1000);
        });
    };

    setTimeout(loadApp, 1000);

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    mainWindow.webContents.on('crashed', () => {
        app.relaunch();
        app.exit(0);
    });
}

app.on('ready', startApp);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});
