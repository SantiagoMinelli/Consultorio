process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = true;

const { app, BrowserWindow, ipcMain, session, shell  } = require("electron");
const path = require("path");
const db = require("./db");

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        fullscreenable: true,     
        maximizable: true,        
        minimizable: true,        
        closable: true,           
        frame: true,              
        autoHideMenuBar: false,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
            allowRunningInsecureContent: false
        }
    });

    win.maximize();

    win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': [
                    "default-src 'self'; " +
                    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
                    "style-src 'self' 'unsafe-inline'; " +
                    "img-src 'self' data:; " +
                    "font-src 'self' data:; " + 
                    "connect-src 'self'"
                ]
            }
        });
    });

    win.loadFile(path.join(__dirname, "renderer", "index.html"));
}

app.whenReady().then(createWindow);

ipcMain.handle("guardar-paciente", (event, paciente) => {
    return db.guardarPaciente(paciente);
});

ipcMain.handle("editar-paciente", (event, paciente) => {
    return db.editarPaciente(paciente);
});

ipcMain.handle("get-pacientes", (event, { apellido, nombre }) => {
    return db.getPacientes(apellido, nombre);
});

ipcMain.handle("get-sesiones", (event, pacienteId) => {
    return db.getSesionesByPaciente(pacienteId);
});

ipcMain.handle("get-all-pacientes", (event) => {
    return db.getAllPacientes();
});

// Cambiado de guardarSesionAutomatica a registrarSesion
ipcMain.handle("registrar-sesion", (event, pacienteId) => {
    return db.registrarSesion(pacienteId);
});

// Nuevo handler para eliminar sesión
ipcMain.handle("eliminar-sesion", (event, sesionId) => {
    return db.eliminarSesion(sesionId);
});

// Nuevo handler para eliminar pedido
ipcMain.handle("eliminar-pedido", (event, pedidoId) => {
    return db.eliminarPedido(pedidoId);
});

ipcMain.handle("guardar-pedido", (event, pedidoData) => {
    return db.guardarPedido(pedidoData.pacienteId, pedidoData.tipoSesiones, pedidoData.diagnostico);
});

ipcMain.handle("eliminar-paciente", (event, pacienteId) => {
    return db.eliminarPaciente(pacienteId);
});

// Nuevos handlers
ipcMain.handle("get-sesiones-disponibles", (event, pacienteId) => {
    return db.getSesionesDisponibles(pacienteId);
});

ipcMain.handle("get-pedidos-activos", (event, pacienteId) => {
    return db.getPedidosActivosByPaciente(pacienteId);
});

// Nuevos handlers para exportación
ipcMain.handle("exportar-excel", (event) => {
    return db.exportarDatosExcel();
});

ipcMain.handle("exportar-csv", (event) => {
    return db.exportarDatosCSV();
});

ipcMain.handle("open-folder", (event, folderPath) => {
    try {
        shell.showItemInFolder(folderPath);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle("ya-registro-sesion-hoy", (event, pacienteId) => {
    return db.yaRegistroSesionHoy(pacienteId);
});

// Nuevos handlers para notas
ipcMain.handle("get-notas", (event, pacienteId) => {
    return db.getNotasByPaciente(pacienteId);
});

ipcMain.handle("guardar-nota", (event, notaData) => {
    return db.guardarNota(notaData);
});

ipcMain.handle("eliminar-nota", (event, notaId) => {
    return db.eliminarNota(notaId);
});