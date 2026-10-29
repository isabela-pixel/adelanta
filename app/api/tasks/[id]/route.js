import { NextResponse } from "next/server";
import { notion, hoyCaracas, prop } from "../../../../lib/notion";

const ESTADOS = ["Por hacer", "En curso", "Esperando aprobación", "Hecha", "Descartada"];

// Base "Tasks" del equipo y equivalencia de estados.
const DB_TASKS_EQUIPO = (process.env.NOTION_TASKS_EQUIPO_DB || "3f74f114c662806cb22fc9e622db4559").replace(/-/g, "");
const A_EQUIPO = { "Hecha": "Done", "En curso": "In progress", "Por hacer": "Not started" };

// Si la tarea viene de "Tasks" del equipo, refleja el estado allá también.
async function sincronizarEquipo(page, estado) {
  const destino = A_EQUIPO[estado];
  if (!destino) return { equipo: "no-aplica" };
  const ids = (prop(page, "ID origen") || "").split(/[,\s]+/).filter(Boolean);
  for (const id of ids) {
    let origen;
    try {
      origen = await notion(`/pages/${id}`);
    } catch {
      continue; // sin acceso o no existe: se intenta con el siguiente ID
    }
    const dbId = (origen.parent?.database_id || "").replace(/-/g, "");
    if (dbId !== DB_TASKS_EQUIPO) continue;
    try {
      await notion(`/pages/${id}`, { method: "PATCH", body: { properties: { Status: { status: { name: destino } } } } });
      return { equipo: "ok" };
    } catch {
      return { equipo: "sin-permiso" };
    }
  }
  return { equipo: ids.length ? "pendiente" : "no-aplica" };
}

// Actualiza campos personales de una tarea: fecha propia, recordatorios, estado.
export async function PATCH(req, { params }) {
  try {
    const body = await req.json();
    const properties = {};
    if ("fecha" in body) {
      properties["Mi fecha de entrega"] = { date: body.fecha ? { start: body.fecha } : null };
    }
    if ("recordatorios" in body) {
      properties["Recordatorios"] = { checkbox: !!body.recordatorios };
    }
    if ("estado" in body) {
      if (!ESTADOS.includes(body.estado)) throw new Error("Estado no válido");
      properties["Estado"] = { status: { name: body.estado } };
      properties["Último avance"] = { date: { start: hoyCaracas() } };
    }
    const page = await notion(`/pages/${params.id}`, { method: "PATCH", body: { properties } });
    const sync = "estado" in body ? await sincronizarEquipo(page, body.estado) : { equipo: "no-aplica" };
    return NextResponse.json({ ok: true, id: page.id, ...sync });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
