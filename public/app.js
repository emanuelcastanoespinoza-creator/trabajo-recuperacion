// Interfaz web de SecureDesk. Todo pasa por la API con el token JWT.
// El token se guarda en sessionStorage: se borra al cerrar la pestaña.
const $ = (id) => document.getElementById(id);

// Llama a la API agregando el token en el encabezado Authorization.
async function api(metodo, ruta, cuerpo) {
  const token = sessionStorage.getItem('token');
  const respuesta = await fetch('/api' + ruta, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const datos = respuesta.status === 204 ? null : await respuesta.json();
  if (!respuesta.ok) {
    if (respuesta.status === 401 && token) cerrarSesion(); // token vencido
    throw new Error(datos.errores ? datos.errores.join('. ') : datos.error);
  }
  return datos;
}

// Crea una celda de tabla. Se usa textContent (no innerHTML) para evitar XSS.
function celda(fila, texto) {
  const td = document.createElement('td');
  td.textContent = texto;
  fila.appendChild(td);
  return td;
}

function mostrarMensaje(elemento, texto, ok) {
  elemento.textContent = texto;
  elemento.className = ok ? 'mensaje ok' : 'mensaje';
}

// ---------- Sesión ----------
$('formLogin').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const datos = await api('POST', '/auth/login', {
      email: $('loginEmail').value,
      password: $('loginPassword').value,
    });
    sessionStorage.setItem('token', datos.token);
    sessionStorage.setItem('usuario', JSON.stringify(datos.usuario));
    $('formLogin').reset();
    mostrarMensaje($('msgLogin'), '');
    iniciar();
  } catch (error) {
    mostrarMensaje($('msgLogin'), error.message);
  }
});

function cerrarSesion() {
  sessionStorage.clear();
  iniciar();
}
$('btnSalir').addEventListener('click', cerrarSesion);

// ---------- Tickets ----------
$('formTicket').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api('POST', '/tickets', {
      titulo: $('ticketTitulo').value,
      descripcion: $('ticketDescripcion').value,
      prioridad: $('ticketPrioridad').value,
    });
    $('formTicket').reset();
    mostrarMensaje($('msgTicket'), 'Ticket creado', true);
    cargarTickets();
  } catch (error) {
    mostrarMensaje($('msgTicket'), error.message);
  }
});

async function cargarTickets() {
  const usuario = JSON.parse(sessionStorage.getItem('usuario'));
  const tickets = await api('GET', '/tickets');
  const tabla = $('tablaTickets');
  tabla.innerHTML = '';

  for (const t of tickets) {
    const fila = document.createElement('tr');
    celda(fila, t.id);
    celda(fila, t.titulo);
    celda(fila, t.prioridad);
    const tdEstado = celda(fila, t.estado);
    const tdAcciones = celda(fila, '');

    // Técnico y admin pueden cambiar el estado.
    if (usuario.rol === 'tecnico' || usuario.rol === 'admin') {
      tdEstado.textContent = '';
      const select = document.createElement('select');
      for (const estado of ['abierto', 'en_proceso', 'cerrado']) {
        select.add(new Option(estado, estado, false, estado === t.estado));
      }
      select.addEventListener('change', async () => {
        await api('PATCH', `/tickets/${t.id}/estado`, { estado: select.value });
        cargarTickets();
      });
      tdEstado.appendChild(select);
    }

    // Solo el admin puede eliminar.
    if (usuario.rol === 'admin') {
      const boton = document.createElement('button');
      boton.textContent = 'Eliminar';
      boton.className = 'peligro';
      boton.addEventListener('click', async () => {
        await api('DELETE', `/tickets/${t.id}`);
        cargarTickets();
      });
      tdAcciones.appendChild(boton);
    }
    tabla.appendChild(fila);
  }
}

// ---------- Panel admin ----------
async function cargarPanelAdmin() {
  const usuarios = await api('GET', '/usuarios');
  $('tablaUsuarios').innerHTML = '';
  for (const u of usuarios) {
    const fila = document.createElement('tr');
    celda(fila, u.id);
    celda(fila, u.nombre);
    celda(fila, u.email);
    celda(fila, u.rol);
    $('tablaUsuarios').appendChild(fila);
  }

  const logs = await api('GET', '/logs');
  $('tablaLogs').innerHTML = '';
  for (const l of logs) {
    const fila = document.createElement('tr');
    celda(fila, new Date(l.fecha).toLocaleString());
    celda(fila, l.evento);
    celda(fila, l.email || '');
    celda(fila, l.detalle || '');
    $('tablaLogs').appendChild(fila);
  }
}

// ---------- Inicio ----------
function iniciar() {
  const usuario = JSON.parse(sessionStorage.getItem('usuario') || 'null');
  $('vistaLogin').hidden = !!usuario;
  $('vistaApp').hidden = !usuario;
  $('sesion').hidden = !usuario;
  if (!usuario) return;

  $('quien').textContent = `${usuario.nombre} (${usuario.rol})`;
  $('panelAdmin').hidden = usuario.rol !== 'admin';
  cargarTickets();
  if (usuario.rol === 'admin') cargarPanelAdmin();
}

iniciar();
