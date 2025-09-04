const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs');
const ExcelJS = require('exceljs');

// Crear carpeta data si no existe
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const dbPath = path.join(dataDir, 'medapp.db');
const db = new Database(dbPath);

// Crear tabla pacientes
db.prepare(`
CREATE TABLE IF NOT EXISTS pacientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  apellido TEXT NOT NULL,
  nombre TEXT NOT NULL,
  dni TEXT UNIQUE,
  telefono TEXT,
  nro_afiliado TEXT UNIQUE,
  obra_social TEXT
)
`).run();

// Crear tabla pedidos - MODIFICADA para gestionar sesiones
db.prepare(`
CREATE TABLE IF NOT EXISTS pedidos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  paciente_id INTEGER NOT NULL,
  fecha_pedido TEXT NOT NULL,
  diagnostico TEXT,
  cantidad_sesiones INTEGER,
  sesiones_utilizadas INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT 1,
  FOREIGN KEY(paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE
)
`).run();

// Crear tabla sesiones_realizadas
db.prepare(`
CREATE TABLE IF NOT EXISTS sesiones_realizadas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pedido_id INTEGER NOT NULL,
  paciente_id INTEGER NOT NULL,
  fecha_sesion TEXT NOT NULL,
  observaciones TEXT,
  FOREIGN KEY(pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
  FOREIGN KEY(paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE
)
`).run();

// Crear tabla notas
db.prepare(`
CREATE TABLE IF NOT EXISTS notas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  paciente_id INTEGER NOT NULL,
  descripcion TEXT NOT NULL,
  fecha_creacion TEXT NOT NULL,
  FOREIGN KEY(paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE
)
`).run();

// Función para verificar si paciente ya existe (excluyendo el actual en edición)
function pacienteExiste(dni, nroAfiliado, excludeId = null) {
  let query = `
    SELECT COUNT(*) as count FROM pacientes 
    WHERE (dni = ? OR nro_afiliado = ?)
  `;
  const params = [dni, nroAfiliado];
  
  if (excludeId) {
    query += ` AND id != ?`;
    params.push(excludeId);
  }
  
  const stmt = db.prepare(query);
  const result = stmt.get(...params);
  return result.count > 0;
}

// Función para guardar paciente con validación
function guardarPaciente(paciente) {
  // Verificar si ya existe
  if (pacienteExiste(paciente.dni, paciente.nroAfiliado)) {
    return { success: false, error: 'El paciente ya existe (mismo DNI o número de afiliado)' };
  }

  const stmt = db.prepare(`
    INSERT INTO pacientes (apellido, nombre, dni, telefono, nro_afiliado, obra_social)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  try {
    const result = stmt.run(
      paciente.apellido,
      paciente.nombre,
      paciente.dni,
      paciente.telefono,
      paciente.nroAfiliado,
      paciente.obraSocial
    );

    return { success: true, id: result.lastInsertRowid };
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return { success: false, error: 'El número de afiliado o DNI ya existe.' };
    }
    return { success: false, error: error.message };
  }
}

// Función para editar paciente
function editarPaciente(paciente) {
  // Verificar si ya existe (excluyendo el actual)
  if (pacienteExiste(paciente.dni, paciente.nroAfiliado, paciente.id)) {
    return { success: false, error: 'Ya existe otro paciente con el mismo DNI or número de afiliado' };
  }

  const stmt = db.prepare(`
    UPDATE pacientes 
    SET apellido = ?, nombre = ?, dni = ?, telefono = ?, nro_afiliado = ?, obra_social = ?
    WHERE id = ?
  `);

  try {
    const result = stmt.run(
      paciente.apellido,
      paciente.nombre,
      paciente.dni,
      paciente.telefono,
      paciente.nroAfiliado,
      paciente.obraSocial,
      paciente.id
    );

    return { success: true, changes: result.changes };
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return { success: false, error: 'El número de afiliado o DNI ya existe para otro paciente.' };
    }
    return { success: false, error: error.message };
  }
}

// ✅ Función para buscar pacientes en la BD
function getPacientes(apellido, nombre) {
  let query = `SELECT * FROM pacientes WHERE 1=1`;
  const params = [];

  if (apellido) {
    query += ` AND LOWER(apellido) LIKE ?`;
    params.push(`%${apellido.toLowerCase()}%`);
  }

  if (nombre) {
    query += ` AND LOWER(nombre) LIKE ?`;
    params.push(`%${nombre.toLowerCase()}%`);
  }

  const stmt = db.prepare(query);
  return stmt.all(params);
}

// Función para obtener pedidos activos por paciente
function getPedidosActivosByPaciente(pacienteId) {
  const stmt = db.prepare(`
    SELECT * FROM pedidos 
    WHERE paciente_id = ? AND activo = 1
    ORDER BY fecha_pedido DESC
  `);
  return stmt.all(pacienteId);
}

// Función para obtener sesiones realizadas por paciente (MODIFICADA para incluir ID)
function getSesionesByPaciente(pacienteId) {
  const stmt = db.prepare(`
    SELECT sr.id, sr.fecha_sesion, sr.observaciones, p.diagnostico
    FROM sesiones_realizadas sr
    JOIN pedidos p ON sr.pedido_id = p.id
    WHERE sr.paciente_id = ?
    ORDER BY sr.fecha_sesion DESC
  `);
  return stmt.all(pacienteId);
}

function getAllPacientes() {
  const stmt = db.prepare(`
    SELECT * FROM pacientes 
    ORDER BY apellido, nombre
  `);
  return stmt.all();
}

function yaRegistroSesionHoy(pacienteId) {
  const fechaHoy = new Date().toISOString().split('T')[0];
  const stmt = db.prepare(`
    SELECT COUNT(*) as count 
    FROM sesiones_realizadas 
    WHERE paciente_id = ? AND fecha_sesion = ?
  `);
  const result = stmt.get(pacienteId, fechaHoy);
  return result.count > 0;
}

// Función para verificar y registrar una sesión - CORREGIDA
function registrarSesion(pacienteId) {
  // Verificar si ya se registró una sesión hoy
  if (yaRegistroSesionHoy(pacienteId)) {
    return { success: false, error: 'Ya se registró una sesión para este paciente hoy' };
  }
  
  const fechaActual = new Date().toISOString().split('T')[0];
  
  // Buscar pedidos activos (priorizar gimnasio primero)
  const stmtPedidos = db.prepare(`
    SELECT id, cantidad_sesiones, sesiones_utilizadas 
    FROM pedidos 
    WHERE paciente_id = ? AND activo = 1 
    AND (cantidad_sesiones = -1 OR cantidad_sesiones > sesiones_utilizadas)
    ORDER BY 
      CASE WHEN cantidad_sesiones = -1 THEN 0 ELSE 1 END, -- Gimnasio primero
      fecha_pedido ASC
  `);
  
  const pedidos = stmtPedidos.all(pacienteId);
  
  if (pedidos.length === 0) {
    return { success: false, error: 'No hay pedidos activos con sesiones disponibles' };
  }
  
  // Usar el primer pedido disponible
  const pedido = pedidos[0];
  
  // Iniciar transacción
  const transaction = db.transaction(() => {
    // Solo actualizar si NO es gimnasio (cantidad_sesiones != -1)
    if (pedido.cantidad_sesiones !== -1) {
      const stmtUpdate = db.prepare(`
        UPDATE pedidos 
        SET sesiones_utilizadas = sesiones_utilizadas + 1 
        WHERE id = ?
      `);
      stmtUpdate.run(pedido.id);
    }
    
    // Registrar sesión realizada
    const stmtSesion = db.prepare(`
      INSERT INTO sesiones_realizadas (pedido_id, paciente_id, fecha_sesion, observaciones)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmtSesion.run(pedido.id, pacienteId, fechaActual, 'Sesión realizada');
    
    return { id: result.lastInsertRowid, fecha: fechaActual };
  });
  
  try {
    const result = transaction();
    return { success: true, id: result.id, fecha: result.fecha };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Función para eliminar una sesión y actualizar el contador del pedido
function eliminarSesion(sesionId) {
    const transaction = db.transaction(() => {
        // Primero obtener información de la sesión para actualizar el pedido
        const stmtGetSesion = db.prepare(`
            SELECT pedido_id, paciente_id FROM sesiones_realizadas WHERE id = ?
        `);
        const sesion = stmtGetSesion.get(sesionId);
        
        if (!sesion) {
            throw new Error('Sesión no encontrada');
        }
        
        // Eliminar la sesión
        const stmtDelete = db.prepare(`DELETE FROM sesiones_realizadas WHERE id = ?`);
        const result = stmtDelete.run(sesionId);
        
        // Actualizar el pedido (decrementar sesiones utilizadas)
        const stmtUpdatePedido = db.prepare(`
            UPDATE pedidos 
            SET sesiones_utilizadas = sesiones_utilizadas - 1 
            WHERE id = ? AND sesiones_utilizadas > 0
        `);
        stmtUpdatePedido.run(sesion.pedido_id);
        
        return { 
            changes: result.changes, 
            pacienteId: sesion.paciente_id 
        };
    });
    
    try {
        const result = transaction();
        return { success: true, ...result };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Función para eliminar un pedido activo y sus sesiones asociadas
function eliminarPedido(pedidoId) {
    const transaction = db.transaction(() => {
        // Primero obtener información del pedido
        const stmtGetPedido = db.prepare(`
            SELECT paciente_id FROM pedidos WHERE id = ?
        `);
        const pedido = stmtGetPedido.get(pedidoId);
        
        if (!pedido) {
            throw new Error('Pedido no encontrado');
        }
        
        // Eliminar las sesiones asociadas al pedido
        const stmtDeleteSesiones = db.prepare(`DELETE FROM sesiones_realizadas WHERE pedido_id = ?`);
        stmtDeleteSesiones.run(pedidoId);
        
        // Eliminar el pedido
        const stmtDeletePedido = db.prepare(`DELETE FROM pedidos WHERE id = ?`);
        const result = stmtDeletePedido.run(pedidoId);
        
        return { 
            changes: result.changes, 
            pacienteId: pedido.paciente_id 
        };
    });
    
    try {
        const result = transaction();
        return { success: true, ...result };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Función para guardar nuevo pedido
function guardarPedido(pacienteId, cantidad_sesiones, diagnostico) {
  const fechaActual = new Date().toISOString().split('T')[0];
  
  // Si es gimnasio, establecer cantidad_sesiones como -1 (sin límite)
  const cantidadFinal = cantidad_sesiones === 'gimnasio' ? -1 : parseInt(cantidad_sesiones);
  
  const stmt = db.prepare(`
    INSERT INTO pedidos (paciente_id, fecha_pedido, diagnostico, cantidad_sesiones)
    VALUES (?, ?, ?, ?)
  `);
  try {
    const result = stmt.run(pacienteId, fechaActual, diagnostico, cantidadFinal);
    return { success: true, id: result.lastInsertRowid };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Función para obtener sesiones disponibles
function getSesionesDisponibles(pacienteId) {
  const stmt = db.prepare(`
    SELECT 
      SUM(CASE 
        WHEN cantidad_sesiones = -1 THEN 9999 -- Gimnasio (sin límite)
        ELSE cantidad_sesiones - sesiones_utilizadas 
      END) as disponibles,
      GROUP_CONCAT(diagnostico) as diagnosticos,
      SUM(CASE 
        WHEN cantidad_sesiones = -1 THEN 1 -- Indicador de gimnasio
        ELSE 0 
      END) as tiene_gimnasio
    FROM pedidos 
    WHERE paciente_id = ? AND activo = 1
  `);
  const result = stmt.get(pacienteId);
  return result || { disponibles: 0, diagnosticos: 'Gimnasio', tiene_gimnasio: 0 };
}

// Función para eliminar paciente
function eliminarPaciente(pacienteId) {
  const transaction = db.transaction(() => {
    // Eliminar sesiones realizadas
    const stmtSesiones = db.prepare(`DELETE FROM sesiones_realizadas WHERE paciente_id = ?`);
    stmtSesiones.run(pacienteId);
    
    // Eliminar pedidos
    const stmtPedidos = db.prepare(`DELETE FROM pedidos WHERE paciente_id = ?`);
    stmtPedidos.run(pacienteId);
    
    // Eliminar paciente
    const stmtPaciente = db.prepare(`DELETE FROM pacientes WHERE id = ?`);
    const result = stmtPaciente.run(pacienteId);
    
    return { changes: result.changes };
  });
  
  try {
    const result = transaction();
    return { success: true, changes: result.changes };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Función para exportar todos los datos a Excel
function exportarDatosExcel() {
    const workbook = new ExcelJS.Workbook();
    const fecha = new Date().toISOString().split('T')[0];
    const filename = `backup_medapp_${fecha}.xlsx`;
    const filePath = path.join(dataDir, filename);

    // Hoja de Pacientes
    const worksheetPacientes = workbook.addWorksheet('Pacientes');
    worksheetPacientes.columns = [
        { header: 'Apellido', key: 'apellido', width: 20 },
        { header: 'Nombre', key: 'nombre', width: 20 },
        { header: 'DNI', key: 'dni', width: 15 },
        { header: 'Teléfono', key: 'telefono', width: 15 },
        { header: 'Nro Afiliado', key: 'nro_afiliado', width: 15 },
        { header: 'Obra Social', key: 'obra_social', width: 20 }
    ];

    const pacientes = db.prepare('SELECT * FROM pacientes ORDER BY apellido, nombre').all();
    worksheetPacientes.addRows(pacientes);

    const resumen = db.prepare(`
        SELECT 
            p.apellido || ', ' || p.nombre as paciente,
            p.dni,
            SUM(pe.cantidad_sesiones) as total_pedidas,
            SUM(pe.sesiones_utilizadas) as total_utilizadas,
            SUM(pe.cantidad_sesiones - pe.sesiones_utilizadas) as disponibles,
            MAX(sr.fecha_sesion) as ultima_sesion
        FROM pacientes p
        LEFT JOIN pedidos pe ON p.id = pe.paciente_id AND pe.activo = 1
        LEFT JOIN sesiones_realizadas sr ON p.id = sr.paciente_id
        GROUP BY p.id
        ORDER BY p.apellido, p.nombre
    `).all();

    worksheetResumen.addRows(resumen);

    return workbook.xlsx.writeFile(filePath)
        .then(() => {
            return { success: true, filePath, filename };
        })
        .catch(error => {
            return { success: false, error: error.message };
        });
}

// Función para exportar a CSV
function exportarDatosCSV() {
    const fecha = new Date().toISOString().split('T')[0];
    const csvDir = path.join(dataDir, 'csv_exports');
    
    if (!fs.existsSync(csvDir)) {
        fs.mkdirSync(csvDir, { recursive: true });
    }

    // Exportar pacientes
    const pacientes = db.prepare('SELECT * FROM pacientes ORDER BY apellido, nombre').all();
    const pacientesCSV = convertToCSV(pacientes, ['Apellido', 'Nombre', 'DNI', 'Telefono', 'Nro Afiliado', 'Obra Social']);
    fs.writeFileSync(path.join(csvDir, `pacientes_${fecha}.csv`), pacientesCSV);

    return { 
        success: true, 
        message: 'Archivos CSV exportados correctamente',
        directory: csvDir
    };
}

// Función auxiliar para convertir datos a CSV
function convertToCSV(data, headers) {
    const csvRows = [];
    
    // Headers
    csvRows.push(headers.join(','));
    
    // Data
    data.forEach(row => {
        const values = headers.map(header => {
            const value = row[header];
            // Escapar comillas y manejar valores nulos
            return value !== null && value !== undefined 
                ? `"${String(value).replace(/"/g, '""')}"` 
                : '""';
        });
        csvRows.push(values.join(','));
    });
    
    return csvRows.join('\n');
}

// Función para obtener estadísticas del sistema
function getEstadisticas() {
    const stats = {
        total_pacientes: db.prepare('SELECT COUNT(*) as count FROM pacientes').get().count,
        total_pedidos: db.prepare('SELECT COUNT(*) as count FROM pedidos').get().count,
        total_sesiones: db.prepare('SELECT COUNT(*) as count FROM sesiones_realizadas').get().count,
        pedidos_activos: db.prepare('SELECT COUNT(*) as count FROM pedidos WHERE activo = 1').get().count,
        sesiones_hoy: db.prepare('SELECT COUNT(*) as count FROM sesiones_realizadas WHERE fecha_sesion = date("now")').get().count
    };
    
    return stats;
}

// Función para obtener notas por paciente
function getNotasByPaciente(pacienteId) {
  const stmt = db.prepare(`
    SELECT * FROM notas 
    WHERE paciente_id = ?
    ORDER BY fecha_creacion DESC
  `);
  return stmt.all(pacienteId);
}

// Función para guardar nueva nota
function guardarNota(notaData) {
  const fechaActual = new Date().toISOString().split('T')[0];
  const stmt = db.prepare(`
    INSERT INTO notas (paciente_id, descripcion, fecha_creacion)
    VALUES (?, ?, ?)
  `);
  
  try {
    const result = stmt.run(notaData.pacienteId, notaData.descripcion, fechaActual);
    return { success: true, id: result.lastInsertRowid };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Función para eliminar nota
function eliminarNota(notaId) {
  const stmt = db.prepare(`DELETE FROM notas WHERE id = ?`);
  
  try {
    const result = stmt.run(notaId);
    return { success: true, changes: result.changes };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
    guardarPaciente,
    editarPaciente,
    getPacientes,
    getSesionesByPaciente,
    getAllPacientes,
    registrarSesion,
    eliminarSesion,
    eliminarPedido,
    guardarPedido,
    eliminarPaciente,
    getPedidosActivosByPaciente,
    getSesionesDisponibles,
    exportarDatosExcel,
    exportarDatosCSV,
    yaRegistroSesionHoy,
    getEstadisticas,
    getNotasByPaciente,
    guardarNota,
    eliminarNota
};