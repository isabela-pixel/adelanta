import { NextResponse } from "next/server";
import { notion, DB_TAREAS } from "../../../lib/notion";

// Crear una tarea manual desde el dashboard.
export async function POST(req) {
  try {
    const { tarea, fecha, prioridad, pasos = [] } = await req.json();
    if (!tarea?.trim()) throw new Error("Falta el nombre de la tarea");
    const properties = {
      Tarea: { title: [{ text: { content: tarea.trim() } }] },
      Estado: { status: { name: "Por hacer" } },
      Fuente: { select: { name: "Manual" } },
      Recordatorios: { checkbox: !!fecha },
      "Pasos totales": { number: pasos.length },
      "Pasos hechos": { number: 0 },
      Orden: { number: 99 },
    };
    if (prioridad) properties.Prioridad = { select: { name: prioridad } };
    if (fecha) properties["Mi fecha de entrega"] = { date: { start: fecha } };
    const children = pasos
      .filter((p) => p.trim())
      .map((p) => ({ object: "block", type: "to_do", to_do: { rich_text: [{ text: { content: p.trim() } }], checked: false } }));
    const page = await notion("/pages", {
      method: "POST",
      body: { parent: { database_id: DB_TAREAS }, properties, children },
    });
    return NextResponse.json({ ok: true, id: page.id });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
