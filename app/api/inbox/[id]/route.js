import { NextResponse } from "next/server";
import { notion } from "../../../../lib/notion";

// Aprobar o rechazar un cambio propuesto por Claude.
// Claude lo aplica en su siguiente revisión programada.
export async function PATCH(req, { params }) {
  try {
    const { estado } = await req.json();
    if (!["Aprobada", "Rechazada", "Propuesta"].includes(estado)) throw new Error("Estado no válido");
    await notion(`/pages/${params.id}`, {
      method: "PATCH",
      body: { properties: { Estado: { select: { name: estado } } } },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
