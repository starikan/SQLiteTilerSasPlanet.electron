const ipc = require('electron').ipcRenderer;

// Select Folders
const filesFolderBtn = document.getElementById('filesFolderBtn');
filesFolderBtn.addEventListener('click', function() {
    ipc.send('open-file-dialog', 'filesFolder');
});

const sasFolderBtn = document.getElementById('sasFolderBtn');
sasFolderBtn.addEventListener('click', function() {
    ipc.send('open-file-dialog', 'sasFolder');
});

ipc.on('selected-directory', function(event, data) {
    document.getElementById(data.field).value = `${data.path[0]}`
})

// Generate ZMP Folders
const ZMPGen = document.getElementById('ZMPGen');
ZMPGen.addEventListener('click', function() {
    let data = {}

    data.foldersMaps = document.getElementById('filesFolder').value ? [document.getElementById('filesFolder').value] : "";
    data.folderSasMaps = document.getElementById('sasFolder').value ? document.getElementById('sasFolder').value : "";
    data.filesExts = document.getElementById('ext').value ? document.getElementById('ext').value.split(/,\s?/) : ["sqlitedb", "sqlite"];

    if (data.foldersMaps && data.folderSasMaps && data.filesExts) {
        ipc.send('ZMPGen', data);
    }
    else {
        alert('You need to fill all fields')
    }
});
