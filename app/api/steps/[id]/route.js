import { NextResponse } from "next/server";
import { notion, getPasos, hoyCaracas, mapTarea } from "../../../../lib/notion";

// Marca o desmarca un paso (bloque to_do) y recalcula el avance de su tarea.
export async function PATCH(req, { params }) {
  try {
    const { hecho, taskId } = await req.json();
    await notion(`/blocks/${params.id}`, { method: "PATCH", body: { to_do: { checked: !!hecho } } });

    const pasos = await getPasos(taskId);
    const hechos = pasos.filter((p) => p.hecho).length;
    const tarea = mapTarea(await notion(`/pages/${taskId}`));

    const properties = {
      "Pasos totales": { number: pasos.length },
      "Pasos hechos": { number: hechos },
    };
    if (hecho) properties["Último avance"] = { date: { start: hoyCaracas() } };
    if (hechos > 0 && tarea.estado === "Por hacer") properties["Estado"] = { status: { name: "En curso" } };

    await notion(`/pages/${taskId}`, { method: "PATCH", body: { properties } });
    return NextResponse.json({ ok: true, hechos, total: pasos.length });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
