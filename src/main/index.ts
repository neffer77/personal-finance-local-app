import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import { initDatabase, closeDatabase } from './database/connection'
import { runMigrations } from './database/migrate'
import { registerAllHandlers } from './ipc'
import { IPC } from '../shared/ipc-channels'

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hiddenInset',
    show: false,
  })

  // Load the renderer
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// Dialog handlers (registered here since they need access to the window)
function registerDialogHandlers(): void {
  ipcMain.handle(IPC.DIALOG_OPEN_FILE, async (_event, options?: Electron.OpenDialogOptions) => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile'],
      filters: [{ name: 'CSV Files', extensions: ['csv'] }],
      ...options,
    })
    return result
  })

  ipcMain.handle(IPC.DIALOG_SAVE_FILE, async (_event, options?: Electron.SaveDialogOptions) => {
    const result = await dialog.showSaveDialog(mainWindow!, {
      filters: [{ name: 'SQLite Database', extensions: ['db'] }],
      ...options,
    })
    return result
  })
}

app.whenReady().then(() => {
  // Initialize database and run migrations
  try {
    const db = initDatabase()
    runMigrations(db)
  } catch (err) {
    console.error('Database initialization failed:', err)
    // Continue — the recovery screen will be shown by the renderer
  }

  // Register all IPC handlers
  registerAllHandlers()
  registerDialogHandlers()

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  closeDatabase()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  closeDatabase()
})
