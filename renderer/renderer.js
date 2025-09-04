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
    
        // Modal notas
        document.querySelector('#modalNotas .close')?.addEventListener('click', cerrarModalNotas);
        document.getElementById('btnCancelarNotas')?.addEventListener('click', cerrarModalNotas);
        document.getElementById('btnAgregarNota')?.addEventListener('click', abrirModalNuevaNota);
        
        // Modal nueva nota
        document.querySelector('#modalNuevaNota .close')?.addEventListener('click', cerrarModalNuevaNota);
        document.getElementById('cancelarNuevaNota')?.addEventListener('click', cerrarModalNuevaNota);
        document.getElementById('guardarNuevaNota')?.addEventListener('click', guardarNuevaNota);
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
        if (!pacienteActual || !pacienteActual.id) {
            console.error("Error: pacienteActual es null o no tiene ID", pacienteActual);
            Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se ha seleccionado un paciente válido.'
            });
            cerrarModalPedido();
            return;
        }

        const tipoSesiones = document.getElementById('selectSesiones').value;
        const diagnostico = document.getElementById('diagnostico').value.trim();

        // Si es gimnasio, establecer diagnóstico vacío
        const diagnosticoFinal = tipoSesiones === 'gimnasio' ? ' ' : diagnostico;

        if (tipoSesiones !== 'gimnasio' && !diagnosticoFinal) {
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
            diagnostico: diagnosticoFinal
            });

            if (result.success) {
            Swal.fire({
                icon: 'success',
                title: 'Éxito',
                text: `Pedido ${tipoSesiones === 'gimnasio' ? 'de Gimnasio' : ''} guardado para ${pacienteActual.apellido}, ${pacienteActual.nombre}`
            });
            
            const pacienteTemp = {...pacienteActual};
            cerrarModalPedido();
            
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
            pacienteActual = null;
        }
    }

    // Mostrar/ocultar campo diagnóstico según selección
    document.getElementById('selectSesiones')?.addEventListener('change', function() {
    const diagnosticoGroup = document.querySelector('.form-group:has(#diagnostico)');
    if (this.value === 'gimnasio') {
        diagnosticoGroup.style.display = 'none';
        document.getElementById('diagnostico').value = '';
    } else {
        diagnosticoGroup.style.display = 'block';
        document.getElementById('diagnostico').value = '';
    }
    });
    
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
                    // MODIFICACIÓN: Mostrar texto descriptivo para gimnasio
                    let textoPedido;
                    if (pedido.cantidad_sesiones === -1) {
                        textoPedido = `Gimnasio - Sesiones ilimitadas`;
                    } else {
                        textoPedido = `${pedido.diagnostico || 'Sin diagnóstico'} (${pedido.cantidad_sesiones - pedido.sesiones_utilizadas}/${pedido.cantidad_sesiones} sesiones disponibles)`;
                    }

                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td colspan="4" style="background: #f8f9fa; font-weight: bold;">
                            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                                <div>
                                    <i class="fas fa-file-medical"></i> Pedido del ${pedido.fecha_pedido}: ${textoPedido}
                                </div>
                                <button class="btn-eliminar-pedido" title="Eliminar pedido" data-pedido-id="${pedido.id}">
                                    <i class="fas fa-trash"></i>
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
                            <button class="btn-eliminar-sesion" title="Eliminar sesión" data-sesion-id="${sesion.id}">
                                <i class="fas fa-trash"></i>
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

            // CORRECCIÓN: Usar event delegation para manejar los clics en los botones de eliminar
            tablaBody.addEventListener('click', (e) => {
                // Manejar clics en botones de eliminar sesión
                if (e.target.closest('.btn-eliminar-sesion')) {
                    const button = e.target.closest('.btn-eliminar-sesion');
                    const sesionId = button.getAttribute('data-sesion-id');
                    if (sesionId) {
                        eliminarSesion(sesionId);
                    }
                }
                
                // Manejar clics en botones de eliminar pedido
                if (e.target.closest('.btn-eliminar-pedido')) {
                    const button = e.target.closest('.btn-eliminar-pedido');
                    const pedidoId = button.getAttribute('data-pedido-id');
                    if (pedidoId) {
                        eliminarPedido(pedidoId);
                    }
                }
            });

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
            confirmButtonColor: '#4CAF50',
            cancelButtonColor: '#d63030ff'
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
            confirmButtonColor: '#4CAF50',
            cancelButtonColor: '#d63030ff'
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
    // MODAL NOTAS
    // ============================
    async function abrirModalNotas(paciente) {
        try {
            pacienteActual = paciente;
            const notas = await window.electronAPI.getNotas(paciente.id);

            document.getElementById('tituloModalNotas').textContent = 
                `Notas - ${paciente.apellido}, ${paciente.nombre}`;

            const tablaBody = document.getElementById('tablaNotasBody');
            tablaBody.innerHTML = '';

            if (notas && notas.length > 0) {
                notas.forEach(nota => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td><i class="fas fa-calendar-day"></i> ${nota.fecha_creacion}</td>
                        <td>${nota.descripcion || '-'}</td>
                        <td>
                            <button class="btn-eliminar-nota" title="Eliminar nota" data-nota-id="${nota.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    `;
                    tablaBody.appendChild(row);
                });
            } else {
                const row = document.createElement('tr');
                row.innerHTML = '<td colspan="3" style="text-align: center;">No hay notas registradas</td>';
                tablaBody.appendChild(row);
            }

            // Event delegation para eliminar notas
            tablaBody.addEventListener('click', (e) => {
                if (e.target.closest('.btn-eliminar-nota')) {
                    const button = e.target.closest('.btn-eliminar-nota');
                    const notaId = button.getAttribute('data-nota-id');
                    if (notaId) {
                        eliminarNota(notaId);
                    }
                }
            });

            document.getElementById('modalNotas').classList.add('show');
        } catch (error) {
            console.error("Error al cargar notas:", error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al cargar notas'
            });
        }
    }

    function cerrarModalNotas() {
        document.getElementById('modalNotas').classList.remove('show');
        pacienteActual = null;
    }

    function abrirModalNuevaNota() {
        document.getElementById('descripcionNota').value = '';
        document.getElementById('modalNuevaNota').classList.add('show');
    }

    function cerrarModalNuevaNota() {
        document.getElementById('modalNuevaNota').classList.remove('show');
    }

    async function guardarNuevaNota() {
        const descripcion = document.getElementById('descripcionNota').value.trim();
        
        if (!descripcion) {
            Swal.fire({
                icon: 'warning',
                title: 'Campo requerido',
                text: 'Por favor ingrese una descripción para la nota'
            });
            return;
        }

        try {
            const result = await window.electronAPI.guardarNota({
                pacienteId: pacienteActual.id,
                descripcion: descripcion
            });

            if (result.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Nota guardada',
                    text: 'La nota fue guardada correctamente'
                });
                
                cerrarModalNuevaNota();
                
                // Recargar el modal de notas para reflejar los cambios
                await abrirModalNotas(pacienteActual);
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: result.error
                });
            }
        } catch (error) {
            console.error("Error al guardar nota:", error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al guardar nota'
            });
        }
    }

    async function eliminarNota(notaId) {
        const { value: confirmar } = await Swal.fire({
            title: '¿Está seguro?',
            text: '¿Eliminar esta nota? Esta acción no se puede deshacer.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#4CAF50',
            cancelButtonColor: '#d63030ff'
        });

        if (confirmar) {
            try {
                const result = await window.electronAPI.eliminarNota(notaId);
                if (result.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Nota eliminada',
                        text: 'La nota fue eliminada correctamente'
                    });
                    
                    // Recargar el modal para reflejar los cambios
                    if (pacienteActual) {
                        await abrirModalNotas(pacienteActual);
                    }
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: result.error
                    });
                }
            } catch (error) {
                console.error("Error al eliminar nota:", error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Error al eliminar nota'
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
            const tieneGimnasio = sesionesDisponibles.tiene_gimnasio > 0;
            
            // Verificar si ya se registró una sesión hoy
            const yaRegistroHoy = await window.electronAPI.yaRegistroSesionHoy(paciente.id);
            
            // Determinar si el botón debe estar deshabilitado
            const botonDeshabilitado = yaRegistroHoy || (!tieneGimnasio && disponibles <= 0);
            const tituloBoton = yaRegistroHoy ? 
            'Ya se registró una sesión hoy' : 
            (tieneGimnasio ? 'Gimnasio - Sesión ilimitada' : (disponibles <= 0 ? 'No hay sesiones disponibles' : 'Registrar sesión'));
            const iconoBoton = botonDeshabilitado ? 'X' : (tieneGimnasio ? '✅' : '✅');
            
            // Texto para mostrar sesiones
            const textoSessiones = tieneGimnasio ? 'Gimnasio' : `${disponibles} sesiones`;

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
                <span class="sesiones-info">${textoSessiones}</span>
            </td>
            <td>
                <button class="btn-action btn-notas" title="Ver notas">
                📝
                </button>
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
            const btnNotas = row.querySelector('.btn-notas');

            // Solo agregar event listener si el botón no está deshabilitado
            if (!botonDeshabilitado) {
                btnFecha.addEventListener('click', () => registrarSesion(paciente, disponibles, tieneGimnasio));
            }
            
            btnPedido.addEventListener('click', () => abrirModalPedido(paciente));
            btnSesiones.addEventListener('click', () => abrirModalSesiones(paciente));
            btnEditar.addEventListener('click', () => abrirModalEditarPaciente(paciente));
            btnEliminar.addEventListener('click', () => eliminarPaciente(paciente));
            btnNotas.addEventListener('click', () => abrirModalNotas(paciente));

            tablaBody.appendChild(row);
        }
    }

    async function registrarSesion(paciente, disponibles, tieneGimnasio) {
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

        // MODIFICACIÓN: No mostrar footer para gimnasio
        const swalOptions = {
            title: 'Confirmar sesión',
            text: `¿Registrar sesión para ${paciente.apellido}, ${paciente.nombre}? `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, registrar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#4CAF50',
            cancelButtonColor: '#d63030ff'
        };

        // Solo agregar footer si NO es gimnasio
        if (!tieneGimnasio) {
            swalOptions.footer = `(Sesiones disponibles: ${disponibles})`;
        }

        const { value: confirmar } = await Swal.fire(swalOptions);

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
                        mostrarPacientesEnTabla([paciente]);
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
            confirmButtonColor: '#4CAF50',
            cancelButtonColor: '#d63030ff'
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