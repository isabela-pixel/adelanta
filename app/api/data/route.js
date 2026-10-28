import { NextResponse } from "next/server";
import { DB_TAREAS, DB_BANDEJA, queryAll, mapTarea, mapBandeja, getPasos, getTexto } from "../../../lib/notion";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [tareasRaw, bandejaRaw] = await Promise.all([
      queryAll(DB_TAREAS, { sorts: [{ property: "Orden", direction: "ascending" }] }),
      queryAll(DB_BANDEJA, { sorts: [{ timestamp: "created_time", direction: "descending" }] }),
    ]);

    const tareas = tareasRaw.map(mapTarea);
    const activas = tareas.filter((t) => t.estado !== "Hecha" && t.estado !== "Descartada");

    // Pasos de las tareas activas (las hechas no hacen falta en detalle).
    const pasos = await Promise.all(activas.map((t) => getPasos(t.id).catch(() => [])));
    activas.forEach((t, i) => { t.pasos = pasos[i]; });

    const bandeja = bandejaRaw.map(mapBandeja);
    const briefing = bandeja.find((b) => b.tipo === "Briefing") || null;
    if (briefing) briefing.contenido = await getTexto(briefing.id).catch(() => []);

    return NextResponse.json({
      tareas,
      propuestas: bandeja.filter((b) => b.tipo === "Cambio propuesto" && ["Propuesta", "Aprobada", "Error"].includes(b.estado)),
      alertas: bandeja.filter((b) => b.tipo === "Alerta").slice(0, 5),
      nuevas: bandeja.filter((b) => b.tipo === "Nueva asignación").slice(0, 5),
      aplicadas: bandeja.filter((b) => b.tipo === "Cambio propuesto" && b.estado === "Aplicada").slice(0, 5),
      briefing,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
