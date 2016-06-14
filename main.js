const electron = require('electron');
// Module to control application life.
const {app} = electron;
// Module to create native browser window.
const {BrowserWindow} = electron;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;

function createWindow() {
  // Create the browser window.
  win = new BrowserWindow({
      width: 450,
      height: 310,
      title: 'SASPlanet SQLite TileServer'
  });

  win.setMenu(null);

  // and load the index.html of the app.
  win.loadURL(`file://${__dirname}/index.html`);

  // Open the DevTools.
  win.webContents.openDevTools();

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null;
  });

}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.



const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const ipc = require('electron').ipcMain;
const dialog = require('electron').dialog;

// SELECT FOLDERS
ipc.on('open-file-dialog', function(event, field) {
    dialog.showOpenDialog({
        properties: ['openDirectory']
    }, function(files) {
        if (files) {
            event.sender.send('selected-directory', {
                path: files,
                field: field
            })
        }
    })
})

// SERVER SECTION
let server = express();
let db;
let dbName;

server.all('/:name/:z/:x/:y', function (req, res) {
    if (dbName != req.params.name) {
        dbName = req.params.name;
        db = new sqlite3.Database(dbName);
    }
    db.get(`SELECT * FROM tiles WHERE z=${req.params.z} AND x=${req.params.x} AND y=${req.params.y}`, function(err, row){
        try {
            res.set('Content-Type', 'image/png');
            res.end(row.image, 'binary');
        } catch (e) {
            res.status(404).end();
        }
    });
});

// Start server on app start
server.listen(9999, function () {
    console.log('Server Start on port 9999');
});


// ZMP GENERATOR SECTION

const fs = require('fs'),
      path = require('path');

const guid = require('guid'),
      translit = require('translit')(require("translit-russian")),
      rmdir = require('rimraf');

// Get all sqlite files in list
let getAllFiles = function(folders, exts) {
    let files = [];
    folders.forEach(function(folder) {
        let allFiles = fs.readdirSync(folder);
        let filteredFiles = [];
        exts.forEach(function(ext) {
            filteredFiles.push(...allFiles.filter(file => file.endsWith(ext)))
        })
        files.push(...filteredFiles.map(file => path.join(folder, file)))
    })
    return files
}

// Create ZMP folders
let generateZMPFolders = function(files, folderSasMaps, serverURI, serverPort){
    files.forEach(function(file){
        let params = {};
        params.name = path.basename(file);
        params.nameFormat = translit(params.name).replace(/(\s+|\.)/g, "_");
        params.nameEncode = encodeURI(file);
        params.pnum = Math.floor(Math.random() * 9000 + 1000);
        params.guid = guid.raw();

        let OutputParams = `[PARAMS]\npnum=${params.pnum}\nGUID={${params.guid}}\nname=${params.nameFormat}\nNameInCache=${params.nameFormat}\nDefURLBase=${serverURI}:${serverPort}/${params.nameEncode}\nContentType=image/png\nExt=.png\nprojection=1\nsradiusa=6378137\nsradiusb=6378137\nseparator=1\nUseDwn=1\nSleep=0\nDefHotKey=0\nPARENTSUBMENU=!\nRequestHead=User-Agent: SAS.Planet\nIteratorSubRectSize=8,8`
        var GetUrlScript = `begin\n     ResultURL:=GetURLBase+'/'+inttostr(18-GetZ)+'/'+inttostr(GetX)+'/'+inttostr(GetY);\nend.`;

        // Remove previous version
        let exportPath = path.join(folderSasMaps, params.nameFormat + ".zmp");
        rmdir(exportPath, function(error){
            fs.mkdirSync(exportPath);
            fs.writeFileSync(path.join(exportPath, "params.txt"), OutputParams);
            fs.writeFileSync(path.join(exportPath, "GetUrlScript.txt"), GetUrlScript);
        });

    })
}


ipc.on('ZMPGen', function(event, data){
    let files = getAllFiles(data.foldersMaps, data.filesExts);
    generateZMPFolders(files, data.folderSasMaps, "http://127.0.0.1", 9999);
});
