import { NextResponse } from "next/server";
import { notion, hoyCaracas } from "../../../../lib/notion";

const ESTADOS = ["Por hacer", "En curso", "Esperando aprobación", "Hecha", "Descartada"];

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
    return NextResponse.json({ ok: true, id: page.id });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
