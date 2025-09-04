const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Pacientes
    getPacientes: (apellido, nombre) => ipcRenderer.invoke('get-pacientes', {apellido, nombre}),
    getAllPacientes: () => ipcRenderer.invoke('get-all-pacientes'),
    guardarPaciente: (paciente) => ipcRenderer.invoke('guardar-paciente', paciente),
    editarPaciente: (paciente) => ipcRenderer.invoke('editar-paciente', paciente),
    eliminarPaciente: (pacienteId) => ipcRenderer.invoke('eliminar-paciente', pacienteId),
    
    // Pedidos y sesiones
    guardarPedido: (pedidoData) => ipcRenderer.invoke('guardar-pedido', pedidoData),
    getSesionesByPaciente: (pacienteId) => ipcRenderer.invoke('get-sesiones', pacienteId),
    getPedidosActivos: (pacienteId) => ipcRenderer.invoke('get-pedidos-activos', pacienteId),
    getSesionesDisponibles: (pacienteId) => ipcRenderer.invoke('get-sesiones-disponibles', pacienteId),
    registrarSesion: (pacienteId) => ipcRenderer.invoke('registrar-sesion', pacienteId),
    eliminarSesion: (sesionId) => ipcRenderer.invoke('eliminar-sesion', sesionId),
    eliminarPedido: (pedidoId) => ipcRenderer.invoke('eliminar-pedido', pedidoId),
    yaRegistroSesionHoy: (pacienteId) => ipcRenderer.invoke('ya-registro-sesion-hoy', pacienteId),
    
    // Notas
    getNotas: (pacienteId) => ipcRenderer.invoke("get-notas", pacienteId),
    guardarNota: (notaData) => ipcRenderer.invoke("guardar-nota", notaData),
    eliminarNota: (notaId) => ipcRenderer.invoke("eliminar-nota", notaId),
    
    // Exportación
    exportarExcel: () => ipcRenderer.invoke('exportar-excel'),
    exportarCSV: () => ipcRenderer.invoke('exportar-csv'),
    openFolder: (folderPath) => ipcRenderer.invoke('open-folder', folderPath)
});