"use strict";

let tareas = [];
let filtroEstado = "todas";
let filtroPrioridad = "todas";

const SECUENCIA_ESTADOS = ["pendiente", "en-progreso", "completada"];

const leerCampo = (selector) => {
  const campo = document.querySelector(selector);
  const valor = campo.value.trim();
  campo.value = "";
  return valor;
};

const tablero = document.querySelector("#tablero");

// Decision de diseno: Estrategia A (Closure)
// Encapsula el contador dentro del ambito lexico de la funcion para garantizar
// estado privado y evitar sobreescrituras accidentales desde otros modulos.
function crearGeneradorId() {
  let contador = 1;
  return () => contador++;
}
const generarId = crearGeneradorId();

// Checkpoint tecnico: Se usa switch porque evaluamos una unica variable (prioridad)
// contra casos discretos y predeterminados, manteniendo la estructura limpia sin anidar if/else.
function obtenerConfigPrioridad(prioridad) {
  switch (prioridad) {
    case "alta":
      return { clase: "prioridad-alta", etiqueta: "Alta" };
    case "media":
      return { clase: "prioridad-media", etiqueta: "Media" };
    case "baja":
      return { clase: "prioridad-baja", etiqueta: "Baja" };
    default:
      return { clase: "prioridad-media", etiqueta: "Media" };
  }
}

function crearElementoTarea({ id, titulo, descripcion, prioridad, estado }) {
  const { clase: clasePrioridad, etiqueta: etiquetaPrioridad } = obtenerConfigPrioridad(prioridad);

  const tarea = document.createElement("article");
  tarea.classList.add("tarea", `estado-${estado}`);
  tarea.dataset.id = id;

  const puedeAvanzar = estado !== "completada";

  tarea.innerHTML = `
    <div>
      <span class="badge-prioridad ${clasePrioridad}">${etiquetaPrioridad}</span>
      <span class="badge-estado">${estado}</span>
    </div>
    <h3>${titulo}</h3>
    <p>${descripcion}</p>
    <div class="acciones-tarea">
      ${puedeAvanzar ? `<button class="btn-avanzar" data-id="${id}" data-action="avanzar">Avanzar estado</button>` : ""}
      <button class="btn-eliminar" data-id="${id}" data-action="eliminar">Eliminar</button>
    </div>
  `;

  return tarea;
}

function agregarTarea() {
  const titulo = leerCampo("#input-titulo");
  const descripcion = leerCampo("#input-descripcion");
  const prioridad = document.querySelector("#select-prioridad").value;

  if (!titulo || !descripcion) {
    alert("El titulo y la descripcion son obligatorios.");
    return;
  }

  const nuevaTarea = { id: generarId(), titulo, descripcion, prioridad, estado: "pendiente" };
  tareas.push(nuevaTarea);

  const elemento = crearElementoTarea(nuevaTarea);
  tablero.appendChild(elemento);

  actualizarStats();
  aplicarFiltros();
}

document.querySelector("#btn-agregar").addEventListener("click", agregarTarea);

function actualizarStats() {
  const conteos = tareas.reduce((acumulador, tarea) => {
    acumulador[tarea.estado] = (acumulador[tarea.estado] || 0) + 1;
    return acumulador;
  }, {});

  const partes = [];
  for (const estado of SECUENCIA_ESTADOS) {
    const cantidad = conteos[estado] || 0;
    partes.push(`${cantidad} ${estado}`);
  }

  document.querySelector("#stats").textContent =
    `Tareas: ${partes.join(" - ")} (total ${tareas.length})`;
}

// Decision de diseno: Estrategia A (Targeted Update)
// Actualiza directamente el nodo del DOM correspondiente sin redibujar todo el tablero.
function actualizarEstadoEnDOM(id, nuevoEstado) {
  const elementoTarea = tablero.querySelector(`[data-id="${id}"]`);
  if (!elementoTarea) return;

  SECUENCIA_ESTADOS.forEach(estado => elementoTarea.classList.remove(`estado-${estado}`));
  elementoTarea.classList.add(`estado-${nuevoEstado}`);

  const badgeEstado = elementoTarea.querySelector(".badge-estado");
  badgeEstado.textContent = nuevoEstado;

  if (nuevoEstado === "completada") {
    const btnAvanzar = elementoTarea.querySelector(".btn-avanzar");
    if (btnAvanzar) btnAvanzar.remove();
  }
}

tablero.addEventListener("click", (e) => {
  const boton = e.target.closest("button[data-action]");
  if (!boton) return;

  const id = Number(boton.dataset.id);

  if (boton.dataset.action === "eliminar") {
    tareas = tareas.filter(t => t.id !== id);
    boton.closest(".tarea").remove();
    actualizarStats();
    return;
  }

  if (boton.dataset.action === "avanzar") {
    const tarea = tareas.find(t => t.id === id);
    const indiceActual = SECUENCIA_ESTADOS.indexOf(tarea.estado);
    if (indiceActual < SECUENCIA_ESTADOS.length - 1) {
      tarea.estado = SECUENCIA_ESTADOS[indiceActual + 1];
      actualizarEstadoEnDOM(id, tarea.estado);
      actualizarStats();
      aplicarFiltros();
    }
  }
});

const btnsFiltroEstado = document.querySelectorAll(".btn-filtro-estado");

btnsFiltroEstado.forEach(btn => {
  btn.addEventListener("click", () => {
    btnsFiltroEstado.forEach(b => b.classList.remove("activo"));
    btn.classList.add("activo");
    filtroEstado = btn.dataset.estado;
    aplicarFiltros();
  });
});

document.querySelector("#select-filtro-prioridad").addEventListener("change", (e) => {
  filtroPrioridad = e.target.value;
  aplicarFiltros();
});

function aplicarFiltros() {
  const todasLasTareas = tablero.querySelectorAll(".tarea");

  todasLasTareas.forEach(elementoTarea => {
    const id = Number(elementoTarea.dataset.id);
    const tarea = tareas.find(t => t.id === id);

    const coincideEstado = filtroEstado === "todas" || tarea.estado === filtroEstado;
    const coincidePrioridad = filtroPrioridad === "todas" || tarea.prioridad === filtroPrioridad;

    elementoTarea.classList.toggle("oculta", !(coincideEstado && coincidePrioridad));
  });
}

actualizarStats();