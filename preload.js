const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    openExternalFile: (filePath) => ipcRenderer.invoke('open-external-file', filePath),
    openWithPhotos: (filePath) => ipcRenderer.invoke('open-with-photos', filePath)
});
