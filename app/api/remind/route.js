import { NextResponse } from "next/server";
import { DB_TAREAS, queryAll, mapTarea, diasHasta, hoyCaracas } from "../../../lib/notion";

export const dynamic = "force-dynamic";

// Lo llama GitHub Actions varias veces al día.
// Manda UN correo con las entregas con recordatorio que están cerca (≤ 2 días) o vencidas
// y en las que no ha habido avance hoy.
export async function GET(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const pages = await queryAll(DB_TAREAS, {
      filter: {
        and: [
          { property: "Recordatorios", checkbox: { equals: true } },
          { property: "Mi fecha de entrega", date: { is_not_empty: true } },
        ],
      },
    });

    const hoy = hoyCaracas();
    const hora = new Date(Date.now() - 4 * 3600 * 1000).getUTCHours();
    const corteFuerte = hora < 10 || (hora >= 15 && hora < 17); // 8 am y 4 pm

    const avisos = [];
    for (const t of pages.map(mapTarea)) {
      if (t.estado === "Hecha" || t.estado === "Descartada") continue;
      const dias = diasHasta(t.fecha);
      if (dias === null || dias > 2) continue;
      const sinAvanceHoy = !t.ultimoAvance || t.ultimoAvance.slice(0, 10) < hoy;
      if (!sinAvanceHoy) continue;
      // Vencidas o para hoy: en cada corrida. A 1–2 días: solo a las 8 am y 4 pm.
      if (dias > 0 && !corteFuerte) continue;
      avisos.push({ t, dias });
    }

    if (avisos.length === 0) return NextResponse.json({ ok: true, enviados: 0 });

    avisos.sort((a, b) => a.dias - b.dias);
    const cuando = (d) => (d < 0 ? `Venció hace ${-d} día${d === -1 ? "" : "s"}` : d === 0 ? "Vence HOY" : d === 1 ? "Vence mañana" : "Vence en 2 días");
    const urgente = avisos.some((a) => a.dias <= 0);
    const url = process.env.DASHBOARD_URL || "";

    const filas = avisos
      .map(({ t, dias }) => {
        const avance = t.pasosTotales ? `${t.pasosHechos} de ${t.pasosTotales} pasos` : "sin pasos marcados";
        const color = dias <= 0 ? "#e2725b" : "#c8962e";
        return `<tr><td style="padding:12px 14px;border-bottom:1px solid #eee">
          <div style="font-weight:600;color:#2a1f2d;font-size:15px">${esc(t.tarea)}</div>
          <div style="margin-top:4px;font-size:13px"><span style="color:${color};font-weight:600">${cuando(dias)}</span>
          <span style="color:#6b5e6e"> · ${avance}${t.prioridad ? ` · Prioridad ${t.prioridad}` : ""}</span></div>
        </td></tr>`;
      })
      .join("");

    const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#f7f2ec;padding:20px">
      <div style="background:#fffdfa;border-radius:14px;overflow:hidden;border:1px solid #e6dcd1">
        <div style="padding:18px 14px 6px"><div style="font-size:20px;font-weight:700;color:#7a3e6b">⏰ ¡A darle, Isa!</div>
        <div style="color:#6b5e6e;font-size:14px;margin-top:4px">Tienes entregas cerca y hoy no has marcado avance en ellas.</div></div>
        <table style="width:100%;border-collapse:collapse">${filas}</table>
        ${url ? `<div style="padding:16px 14px"><a href="${url}" style="background:#7a3e6b;color:#fff;text-decoration:none;padding:10px 16px;border-radius:10px;font-weight:600;display:inline-block">Abrir mi dashboard</a></div>` : ""}
      </div>
      <div style="color:#9a8e9c;font-size:12px;text-align:center;margin-top:10px">Para dejar de recibir avisos de una tarea, apaga su campanita en el dashboard.</div>
    </div>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "Mis tareas <onboarding@resend.dev>",
        to: [process.env.NOTIFY_EMAIL],
        subject: `${urgente ? "🚨" : "⏰"} ${avisos.length === 1 ? avisos[0].t.tarea : `${avisos.length} entregas`}: ${cuando(avisos[0].dias).toLowerCase()}`,
        html,
      }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);

    return NextResponse.json({ ok: true, enviados: avisos.length });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

function esc(s = "") {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
