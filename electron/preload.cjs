const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  onMaximizedChange: (callback) => {
    const handler = (_event, isMax) => callback(isMax);
    ipcRenderer.on('window-maximized-change', handler);
    return () => ipcRenderer.removeListener('window-maximized-change', handler);
  },
  openAppData: () => ipcRenderer.send('open-appdata-folder'),
  getAppDataPath: () => ipcRenderer.invoke('get-appdata-path'),
  getStoragePaths: () => ipcRenderer.invoke('get-storage-paths'),
  browseDirectory: (defaultPath) => ipcRenderer.invoke('browse-directory', defaultPath),
  setStoragePaths: (paths) => ipcRenderer.invoke('set-storage-paths', paths),
  openPath: (targetPath) => ipcRenderer.send('open-path', targetPath),
  platform: process.platform,
  showNotification: (title, body, options = {}) =>
    ipcRenderer.invoke('show-notification', { title, body, ...options }),
  toggleDevTools: () => ipcRenderer.send('toggle-devtools'),
  captureScreenshot: () => ipcRenderer.invoke('capture-screenshot'),
});
