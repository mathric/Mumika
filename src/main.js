const electron = require("electron")
const { app, Menu, dialog, BrowserWindow} = require("electron")

let win = null;

function createWindow() {
  const windowFactor = 0.85;
  const electronScreen = electron.screen
  let size = electronScreen.getPrimaryDisplay().workAreaSize;
  let defaultWidth = Math.floor(size.width * windowFactor);
  let defaultHeight = Math.floor(size.height * windowFactor);
  win = new BrowserWindow({
    width: defaultWidth,
    height: defaultHeight,
    webPreferences: {
      //to enable remote module for renderer process
      enableRemoteModule: true,
      nodeIntegration: true
    }
  })
  setMenu();
  win.loadFile("./src/index.html");
}

app.whenReady().then(createWindow)

//macOS has different quit behavior
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

function setMenu() {
  const isMac = process.platform === 'darwin'

  const template = [
    // { role: 'appMenu' }
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideothers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    // { role: 'fileMenu' }
    {
      label: 'File',
      submenu: [
        isMac ? { role: 'close' } : { role: 'quit' },
        //import the user config file
        {
          label: "import user config", 
          click:importUserConfig
        },
        {
          label: "remove all current setting",
          click: () => {win.webContents.send("custom setting storage", ["removeAll"])}
        }
      ]
    },
    // { role: 'editMenu' }
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac ? [
          { role: 'pasteAndMatchStyle' },
          { role: 'delete' },
          { role: 'selectAll' },
          { type: 'separator' },
          {
            label: 'Speech',
            submenu: [
              { role: 'startSpeaking' },
              { role: 'stopSpeaking' }
            ]
          }
        ] : [
            { role: 'delete' },
            { type: 'separator' },
            { role: 'selectAll' }
          ])
      ]
    },
    // { role: 'viewMenu' }
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    // { role: 'windowMenu' }
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [
          { type: 'separator' },
          { role: 'front' },
          { type: 'separator' },
          { role: 'window' }
        ] : [
            { role: 'close' }
          ])
      ]
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Learn More',
          click: async () => {
            const { shell } = require('electron')
            await shell.openExternal('https://electronjs.org')
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

//import user config file and store the path in local storage for next time open
function importUserConfig() {
  let options = {
    filters: [
      {
        name:"config",
        extensions :["json"]
      }
    ],
    properties: [
      "openFile"
    ]
  }
  let path = dialog.showOpenDialogSync(options);
  if(typeof path !== "undefined") {
    win.webContents.send("custom setting storage", ["write", path[0]]);
    win.webContents.send("custom setting storage", ["reloadStorage", path[0]]);
    
    //initialize page
    win.webContents.send("custom setting storage", ["initPage"]);
  }
}

