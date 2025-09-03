document.addEventListener("DOMContentLoaded", () => {
    // Variables globales
    let pacienteActual = null;
    
    // Inicializar la aplicación
    inicializarApp();

    async function inicializarApp() {
        await cargarTodosLosPacientes();
        inicializarEventListeners();
    }

    function inicializarEventListeners() {
        // Botones de exportación
        document.getElementById('btnExportarExcel')?.addEventListener('click', exportarExcel);
        document.getElementById('btnExportarCSV')?.addEventListener('click', exportarCSV);
        
        // Búsqueda
        document.getElementById('btnBuscar')?.addEventListener('click', buscarPacientes);
        document.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && 
                (e.target.id === 'apellido' || e.target.id === 'nombre')) {
                buscarPacientes();
            }
        });
        
        // Modal paciente
        document.getElementById('btnNuevoPaciente')?.addEventListener('click', abrirModalPacienteNuevo);
        document.querySelector('#modalPaciente .close')?.addEventListener('click', cerrarModalPaciente);
        document.querySelector('#modalPaciente .cancelar')?.addEventListener('click', cerrarModalPaciente);
        document.getElementById('formPaciente')?.addEventListener('submit', guardarPaciente);
        
        // Modal pedido
        document.querySelector('#modalPedido .close')?.addEventListener('click', cerrarModalPedido);
        document.getElementById('cancelPedido')?.addEventListener('click', cerrarModalPedido);
        document.getElementById('confirmPedido')?.addEventListener('click', confirmarPedido);
        
        // Modal sesiones
        document.querySelector('#modalSesiones .close')?.addEventListener('click', cerrarModalSesiones);
    }

    // ============================
    // FUNCIONES DE EXPORTACIÓN
    // ============================
    async function exportarExcel() {
        try {
            const result = await window.electronAPI.exportarExcel();
            if (result.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Éxito',
                    text: `Datos exportados exitosamente a: ${result.filename}`,
                    confirmButtonText: 'Abrir carpeta'
                }).then(() => {
                    window.electronAPI.openFolder(result.filePath);
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: `Error al exportar: ${result.error}`
                });
            }
        } catch (error) {
            console.error("Error en exportación:", error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al exportar los datos'
            });
        }
    }

    async function exportarCSV() {
        try {
            const result = await window.electronAPI.exportarCSV();
            if (result.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Éxito',
                    text: 'Archivos CSV exportados correctamente',
                    confirmButtonText: 'Abrir carpeta'
                }).then(() => {
                    window.electronAPI.openFolder(result.directory);
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: `Error al exportar: ${result.error}`
                });
            }
        } catch (error) {
            console.error("Error en exportación CSV:", error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al exportar los datos CSV'
            });
        }
    }

    // ============================
    // FUNCIONES PRINCIPALES
    // ============================

    async function buscarPacientes() {
        try {
            const apellido = document.getElementById('apellido').value.trim();
            const nombre = document.getElementById('nombre').value.trim();
            
            // Validar que al menos un campo tenga contenido
            if (!apellido && !nombre) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Campos vacíos',
                    text: 'Por favor, ingrese al menos un apellido o nombre para buscar'
                });
                return;
            }
            
            const pacientes = await window.electronAPI.getPacientes(apellido, nombre);
            mostrarPacientesEnTabla(pacientes);
        } catch (error) {
            console.error("Error al buscar pacientes:", error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al buscar pacientes'
            });
        } finally {
            setTimeout(() => {
                document.getElementById('apellido').value = '';
                document.getElementById('nombre').value = '';
                // Opcional: mantener el foco en el primer campo
                document.getElementById('apellido').focus();
            }, 100);
        }
    }

    async function cargarTodosLosPacientes() {
        try {
            const pacientes = await window.electronAPI.getAllPacientes();
            mostrarPacientesEnTabla(pacientes);
        } catch (error) {
            console.error("Error al cargar pacientes:", error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al cargar pacientes'
            });
        }
    }

    // ============================
    // MODAL PACIENTE
    // ============================
    function abrirModalPacienteNuevo() {
        document.getElementById('pacienteId').value = '';
        document.querySelector('#modalPaciente .modal-header h3').innerHTML = '<i class="fas fa-user-plus"></i> Nuevo Paciente';
        document.getElementById('modalPaciente').classList.add('show');
    }

    function abrirModalEditarPaciente(paciente) {
        pacienteActual = paciente;
        
        // Llenar el formulario con los datos del paciente
        document.getElementById('nombrePaciente').value = paciente.nombre || '';
        document.getElementById('apellidoPaciente').value = paciente.apellido || '';
        document.getElementById('dniPaciente').value = paciente.dni || '';
        document.getElementById('telefonoPaciente').value = paciente.telefono || '';
        document.getElementById('nroAfiliadoPaciente').value = paciente.nro_afiliado || '';
        document.getElementById('obraSocialPaciente').value = paciente.obra_social || '';
        
        // Guardar el ID del paciente en un campo oculto
        document.getElementById('pacienteId').value = paciente.id;
        
        // Cambiar el título del modal
        document.querySelector('#modalPaciente .modal-header h3').innerHTML = '<i class="fas fa-user-edit"></i> Editar Paciente';
        
        document.getElementById('modalPaciente').classList.add('show');
    }

    function cerrarModalPaciente() {
        document.getElementById('modalPaciente').classList.remove('show');
        document.getElementById('formPaciente').reset();
        document.getElementById('pacienteId').value = '';
        
        // Restaurar el título original
        document.querySelector('#modalPaciente .modal-header h3').innerHTML = '<i class="fas fa-user-plus"></i> Nuevo Paciente';
        
        ocultarError();
        pacienteActual = null;
    }

    async function guardarPaciente(e) {
        e.preventDefault();
        
        const pacienteId = document.getElementById('pacienteId').value;
        const paciente = {
            nombre: document.getElementById('nombrePaciente').value.trim(),
            apellido: document.getElementById('apellidoPaciente').value.trim(),
            dni: document.getElementById('dniPaciente').value.trim(),
            telefono: document.getElementById('telefonoPaciente').value.trim(),
            nroAfiliado: document.getElementById('nroAfiliadoPaciente').value.trim(),
            obraSocial: document.getElementById('obraSocialPaciente').value.trim()
        };

        if (!validarPaciente(paciente)) return;

        try {
            let result;
            if (pacienteId) {
                // Es una edición
                paciente.id = pacienteId;
                result = await window.electronAPI.editarPaciente(paciente);
            } else {
                // Es un nuevo paciente
                result = await window.electronAPI.guardarPaciente(paciente);
            }
            
            if (result.success) {
                const accion = pacienteId ? 'editado' : 'guardado';
                Swal.fire({
                    icon: 'success',
                    title: 'Éxito',
                    text: `Paciente ${accion}: ${paciente.apellido}, ${paciente.nombre}`
                });
                cerrarModalPaciente();
                
                // MODIFICACIÓN: En lugar de cargar todos los pacientes, buscar solo este paciente
                limpiarCamposBusqueda();
                const pacientes = await window.electronAPI.getPacientes(paciente.apellido, paciente.nombre);
                mostrarPacientesEnTabla(pacientes);
            } else {
                mostrarError(result.error);
            }
        } catch (error) {
            console.error("Error al guardar paciente:", error);
            mostrarError("❌ Error al guardar paciente");
        }
    }

    function validarPaciente(p) {
        if (!p.nombre || !p.apellido || !p.dni || !p.telefono || !p.nroAfiliado || !p.obraSocial) {
            mostrarError("⚠️ Todos los campos son obligatorios");
            return false;
        }
        if (isNaN(p.dni) || isNaN(p.telefono)) {
            mostrarError("⚠️ DNI y Teléfono deben ser números válidos");
            return false;
        }
        ocultarError();
        return true;
    }

    function mostrarError(msg) {
        const errorDiv = document.getElementById('formError');
        errorDiv.textContent = msg;
        errorDiv.classList.remove('hidden');
    }

    function ocultarError() {
        const errorDiv = document.getElementById('formError');
        errorDiv.textContent = '';
        errorDiv.classList.add('hidden');
    }

    // ============================
    // MODAL PEDIDO
    // ============================
    function abrirModalPedido(paciente) {
        // Verificar que el paciente sea válido
        if (!paciente || !paciente.id) {
            console.error("Paciente inválido al abrir modal de pedido:", paciente);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se puede abrir el pedido para este paciente'
            });
            return;
        }
        
        pacienteActual = paciente;
        document.getElementById('modalPedido').classList.add('show');
        document.getElementById('selectSesiones').value = '5';
        document.getElementById('diagnostico').value = '';
    }

    function cerrarModalPedido() {
        document.getElementById('modalPedido').classList.remove('show');
        pacienteActual = null;
    }

    async function confirmarPedido() {
        // CORRECCIÓN: Verificar explícitamente que pacienteActual no sea null
        if (!pacienteActual || !pacienteActual.id) {
            console.error("Error: pacienteActual es null o no tiene ID", pacienteActual);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se ha seleccionado un paciente válido. Por favor, cierre y vuelva a abrir el modal de pedido.'
            });
            cerrarModalPedido();
            return;
        }

        const tipoSesiones = document.getElementById('selectSesiones').value;
        const diagnostico = document.getElementById('diagnostico').value.trim();

        if (!diagnostico) {
            Swal.fire({
                icon: 'warning',
                title: 'Campo requerido',
                text: 'Por favor ingrese el diagnóstico'
            });
            return;
        }

        try {
            const result = await window.electronAPI.guardarPedido({
                pacienteId: pacienteActual.id,
                tipoSesiones: tipoSesiones,
                diagnostico: diagnostico
            });

            if (result.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Éxito',
                    text: `Pedido guardado para ${pacienteActual.apellido}, ${pacienteActual.nombre}`
                });
                
                // Guardar referencia local antes de limpiar pacienteActual
                const pacienteTemp = {...pacienteActual};
                cerrarModalPedido();
                
                // MODIFICACIÓN: En lugar de cargar todos los pacientes, buscar solo este paciente
                limpiarCamposBusqueda();
                const pacientes = await window.electronAPI.getPacientes(pacienteTemp.apellido, pacienteTemp.nombre);
                mostrarPacientesEnTabla(pacientes);
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: result.error
                });
            }
        } catch (error) {
            console.error("Error al guardar pedido:", error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al guardar pedido'
            });
        } finally {
            // Asegurarse de que pacienteActual se limpie incluso si hay error
            pacienteActual = null;
        }
    }
    
    // ============================
    // MODAL SESIONES
    // ============================
    function cerrarModalSesiones() {
        document.getElementById('modalSesiones').classList.remove('show');
    }

    async function abrirModalSesiones(paciente) {
        try {
            pacienteActual = paciente;
            const [sesiones, pedidos] = await Promise.all([
                window.electronAPI.getSesionesByPaciente(paciente.id),
                window.electronAPI.getPedidosActivos(paciente.id)
            ]);

            document.getElementById('tituloModal').textContent = 
                `Sesiones - ${paciente.apellido}, ${paciente.nombre}`;

            const tablaBody = document.getElementById('tablaSesionesBody');
            tablaBody.innerHTML = '';

            // Pedidos activos
            if (pedidos && pedidos.length > 0) {
                pedidos.forEach(pedido => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td colspan="4" style="background: #f8f9fa; font-weight: bold;">
                            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                                <div>
                                    <i class="fas fa-file-medical"></i> Pedido del ${pedido.fecha_pedido}: ${pedido.diagnostico || 'Sin diagnóstico'} 
                                    (${pedido.cantidad_sesiones - pedido.sesiones_utilizadas}/${pedido.cantidad_sesiones} sesiones disponibles)
                                </div>
                                <button class="btn-eliminar-pedido" title="Eliminar pedido" data-pedido-id="${pedido.id}">
                                    <i class="fas fa-trash"></i> Eliminar Pedido
                                </button>
                            </div>
                        </td>
                    `;
                    tablaBody.appendChild(row);
                });
            }

            // Sesiones realizadas
            if (sesiones && sesiones.length > 0) {
                sesiones.forEach(sesion => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td><i class="fas fa-calendar-day"></i> ${sesion.fecha_sesion}</td>
                        <td>${sesion.diagnostico || '-'}</td>
                        <td>${sesion.observaciones || '-'}</td>
                        <td>
                            <button class="btn-eliminar-sesion" data-sesion-id="${sesion.id}">
                                <i class="fas fa-trash"></i> Eliminar
                            </button>
                        </td>
                    `;
                    tablaBody.appendChild(row);
                });
            } else {
                const row = document.createElement('tr');
                row.innerHTML = '<td colspan="4" style="text-align: center;">No hay sesiones registradas</td>';
                tablaBody.appendChild(row);
            }

            // Agregar event listeners a los botones de eliminar
            setTimeout(() => {
                document.querySelectorAll('.btn-eliminar-sesion').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const sesionId = e.target.getAttribute('data-sesion-id');
                        eliminarSesion(sesionId);
                    });
                });
                
                // Agregar event listeners a los botones de eliminar pedido
                document.querySelectorAll('.btn-eliminar-pedido').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const pedidoId = e.target.getAttribute('data-pedido-id');
                        eliminarPedido(pedidoId);
                    });
                });
            }, 100);

            document.getElementById('modalSesiones').classList.add('show');
        } catch (error) {
            console.error("Error al cargar sesiones:", error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al cargar sesiones'
            });
        }
    }

    async function eliminarSesion(sesionId) {
        const { value: confirmar } = await Swal.fire({
            title: '¿Está seguro?',
            text: '¿Eliminar esta sesión? Esta acción no se puede deshacer.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6'
        });

        if (confirmar) {
            try {
                const result = await window.electronAPI.eliminarSesion(sesionId);
                if (result.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Sesión eliminada',
                        text: 'La sesión fue eliminada correctamente'
                    });
                    
                    // Recargar el modal para reflejar los cambios
                    if (pacienteActual) {
                        await abrirModalSesiones(pacienteActual);
                    }
                    
                    // Recargar la tabla principal para actualizar el contador de sesiones
                    await cargarTodosLosPacientes();
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: result.error
                    });
                }
            } catch (error) {
                console.error("Error al eliminar sesión:", error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Error al eliminar sesión'
                });
            }
        }
    }

    async function eliminarPedido(pedidoId) {
        const { value: confirmar } = await Swal.fire({
            title: '¿Está seguro?',
            text: '¿Eliminar este pedido? Esta acción eliminará también todas las sesiones asociadas y no se puede deshacer.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6'
        });

        if (confirmar) {
            try {
                const result = await window.electronAPI.eliminarPedido(pedidoId);
                if (result.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Pedido eliminado',
                        text: 'El pedido y sus sesiones asociadas fueron eliminados correctamente'
                    });
                    
                    // Recargar el modal para reflejar los cambios
                    if (pacienteActual) {
                        await abrirModalSesiones(pacienteActual);
                    }
                    
                    const pacientes = await window.electronAPI.getPacientes(pacienteActual.apellido, pacienteActual.nombre);
                    mostrarPacientesEnTabla(pacientes);
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: result.error
                    });
                }
            } catch (error) {
                console.error("Error al eliminar pedido:", error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Error al eliminar pedido'
                });
            }
        }
    }

    // ============================
    // FUNCIÓN PRINCIPAL DE TABLA
    // ============================
    async function mostrarPacientesEnTabla(pacientes) {
        const tablaBody = document.querySelector('#tablaTurnos tbody');
        if (!tablaBody) return;

        tablaBody.innerHTML = '';

        if (!pacientes || pacientes.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="8" style="text-align: center;">No se encontraron pacientes</td>';
            tablaBody.appendChild(row);
            return;
        }

        for (const paciente of pacientes) {
            const sesionesDisponibles = await window.electronAPI.getSesionesDisponibles(paciente.id);
            const disponibles = sesionesDisponibles.disponibles || 0;
            
            // Verificar si ya se registró una sesión hoy
            const yaRegistroHoy = await window.electronAPI.yaRegistroSesionHoy(paciente.id);
            
            // Determinar si el botón debe estar deshabilitado
            const botonDeshabilitado = yaRegistroHoy || disponibles <= 0;
            const tituloBoton = yaRegistroHoy ? 
                'Ya se registró una sesión hoy' : 
                (disponibles <= 0 ? 'No hay sesiones disponibles' : 'Registrar sesión');
            const iconoBoton = botonDeshabilitado ? '⏸️' : '✅';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${paciente.apellido}, ${paciente.nombre}</td>
                <td>${paciente.dni || '-'}</td>
                <td>${paciente.telefono || '-'}</td>
                <td>${paciente.nro_afiliado || '-'}</td>
                <td>${paciente.obra_social || '-'}</td>
                <td>
                    <button class="btn-action btn-fecha" title="${tituloBoton}" ${botonDeshabilitado ? 'disabled' : ''}>
                        ${iconoBoton}
                    </button>
                    <span class="sesiones-info">${disponibles} sesiones</span>
                </td>
                <td>
                    <button class="btn-action btn-pedido" title="Nuevo pedido">
                        ➕
                    </button>
                    <button class="btn-action btn-sesiones" title="Ver sesiones">
                        🔍
                    </button>
                    <button class="btn-action btn-editar" title="Editar paciente">
                        ✏️
                    </button>
                    <button class="btn-action btn-eliminar" title="Eliminar paciente">
                        ❌
                    </button>
                </td>
            `;

            // Event listeners para los botones
            const btnFecha = row.querySelector('.btn-fecha');
            const btnPedido = row.querySelector('.btn-pedido');
            const btnSesiones = row.querySelector('.btn-sesiones');
            const btnEditar = row.querySelector('.btn-editar');
            const btnEliminar = row.querySelector('.btn-eliminar');

            // Solo agregar event listener si el botón no está deshabilitado
            if (!botonDeshabilitado) {
                btnFecha.addEventListener('click', () => registrarSesion(paciente, disponibles));
            }
            
            btnPedido.addEventListener('click', () => abrirModalPedido(paciente));
            btnSesiones.addEventListener('click', () => abrirModalSesiones(paciente));
            btnEditar.addEventListener('click', () => abrirModalEditarPaciente(paciente));
            btnEliminar.addEventListener('click', () => eliminarPaciente(paciente));

            tablaBody.appendChild(row);
        }
    }

    async function registrarSesion(paciente, disponibles) {
        if (disponibles <= 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Sin sesiones disponibles',
                text: `${paciente.apellido}, ${paciente.nombre} no tiene sesiones disponibles.`,
                confirmButtonText: 'Crear nuevo pedido'
            }).then((result) => {
                if (result.isConfirmed) {
                    abrirModalPedido(paciente);
                }
            });
            return;
        }

        const { value: confirmar } = await Swal.fire({
            title: 'Confirmar sesión',
            text: `¿Registrar sesión para ${paciente.apellido}, ${paciente.nombre}? `,
            footer: `(Sesiones disponibles: ${disponibles})`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, registrar',
            cancelButtonText: 'Cancelar'
        });

        if (confirmar) {
            try {
                const result = await window.electronAPI.registrarSesion(paciente.id);
                if (result.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Sesión registrada',
                        text: `Fecha: ${result.fecha}`
                    });
                    const pacientes = await window.electronAPI.getPacientes(paciente.apellido, paciente.nombre);
                    mostrarPacientesEnTabla(pacientes);
                } else {
                    if (result.error.includes('hoy')) {
                        mostrarPacientesEnTabla(paciente);
                    }
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: result.error
                    });
                }
            } catch (error) {
                console.error("Error al registrar sesión:", error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Error al registrar sesión'
                });
            }
        }
    }

    async function eliminarPaciente(paciente) {
        const { value: confirmar } = await Swal.fire({
            title: '¿Está seguro?',
            text: `¿Eliminar a ${paciente.apellido}, ${paciente.nombre}? Esta acción no se puede deshacer.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6'
        });

        if (confirmar) {
            try {
                const result = await window.electronAPI.eliminarPaciente(paciente.id);
                if (result.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Paciente eliminado',
                        text: 'Paciente eliminado correctamente'
                    });
                    await cargarTodosLosPacientes();
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: result.error
                    });
                }
            } catch (error) {
                console.error("Error al eliminar paciente:", error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Error al eliminar paciente'
                });
            }
        }
    }

    // ============================
    // FUNCIÓN AUXILIAR NUEVA
    // ============================
    function limpiarCamposBusqueda() {
        document.getElementById('apellido').value = '';
        document.getElementById('nombre').value = '';
    }
});