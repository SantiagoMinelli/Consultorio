const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
    guardarPaciente: (paciente) => ipcRenderer.invoke("guardar-paciente", paciente),
    editarPaciente: (paciente) => ipcRenderer.invoke("editar-paciente", paciente),
    getPacientes: (apellido, nombre) => ipcRenderer.invoke("get-pacientes", { apellido, nombre }),
    getSesionesByPaciente: (id) => ipcRenderer.invoke("get-sesiones", id),
    getAllPacientes: () => ipcRenderer.invoke("get-all-pacientes"),
    registrarSesion: (pacienteId) => ipcRenderer.invoke("registrar-sesion", pacienteId),
    eliminarSesion: (sesionId) => ipcRenderer.invoke("eliminar-sesion", sesionId),
    eliminarPedido: (pedidoId) => ipcRenderer.invoke("eliminar-pedido", pedidoId),
    guardarPedido: (pedidoData) => ipcRenderer.invoke("guardar-pedido", pedidoData),
    eliminarPaciente: (pacienteId) => ipcRenderer.invoke("eliminar-paciente", pacienteId),
    getSesionesDisponibles: (pacienteId) => ipcRenderer.invoke("get-sesiones-disponibles", pacienteId),
    getPedidosActivos: (pacienteId) => ipcRenderer.invoke("get-pedidos-activos", pacienteId),
    yaRegistroSesionHoy: (pacienteId) => ipcRenderer.invoke("ya-registro-sesion-hoy", pacienteId),
    exportarExcel: () => ipcRenderer.invoke("exportar-excel"),
    exportarCSV: () => ipcRenderer.invoke("exportar-csv"),
    openFolder: (path) => ipcRenderer.invoke("open-folder", path)
});