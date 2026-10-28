'use strict';

// Runs the app on the desktop, in its own window instead of a browser.
const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 420,
    minHeight: 500,
    title: 'Minecraft Build Helper',
    icon: path.join(__dirname, '..', 'icons', 'icon-512.png'),
    backgroundColor: '#f3f6ee',
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true },
  });
  win.removeMenu();
  win.loadFile(path.join(__dirname, '..', 'index.html'));

  // Open any outside links in the normal browser rather than inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file:')) {
      event.preventDefault();
      if (/^https?:/.test(url)) shell.openExternal(url);
    }
  });
}

// Only one copy of the app at a time; opening it again brings the window forward.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
  app.whenReady().then(createWindow);
  app.on('window-all-closed', () => app.quit());
}
