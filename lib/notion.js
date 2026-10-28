// Cliente mínimo para la API de Notion (sin dependencias).
const API = "https://api.notion.com/v1";
const VERSION = "2022-06-28";

export const DB_TAREAS = process.env.NOTION_TAREAS_DB || "443b739f3fce48b0ab300892bcdb0ce8";
export const DB_BANDEJA = process.env.NOTION_BANDEJA_DB || "e3dce20a73ab4c89a2242605efa7c640";

export async function notion(path, { method = "GET", body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
      "Notion-Version": VERSION,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Notion ${res.status}: ${text}`);
  }
  return res.json();
}

export async function queryAll(dbId, body = {}) {
  let results = [];
  let cursor;
  do {
    const data = await notion(`/databases/${dbId}/query`, {
      method: "POST",
      body: { ...body, page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) },
    });
    results = results.concat(data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return results;
}

// ---- Lectura de propiedades ----
const txt = (arr) => (arr || []).map((t) => t.plain_text).join("");

export function prop(page, name) {
  const p = page.properties?.[name];
  if (!p) return null;
  switch (p.type) {
    case "title": return txt(p.title);
    case "rich_text": return txt(p.rich_text);
    case "select": return p.select?.name ?? null;
    case "status": return p.status?.name ?? null;
    case "url": return p.url;
    case "number": return p.number;
    case "checkbox": return p.checkbox;
    case "date": return p.date?.start ?? null;
    case "formula": return p.formula?.[p.formula.type] ?? null;
    case "relation": return (p.relation || []).map((r) => r.id);
    default: return null;
  }
}

export function mapTarea(page) {
  return {
    id: page.id,
    url: page.url,
    tarea: prop(page, "Tarea"),
    estado: prop(page, "Estado"),
    fuente: prop(page, "Fuente"),
    enlace: prop(page, "Enlace origen"),
    fecha: prop(page, "Mi fecha de entrega"),
    prioridad: prop(page, "Prioridad"),
    orden: prop(page, "Orden"),
    pasosTotales: prop(page, "Pasos totales") || 0,
    pasosHechos: prop(page, "Pasos hechos") || 0,
    ultimoAvance: prop(page, "Último avance"),
    recordatorios: prop(page, "Recordatorios"),
    area: prop(page, "Área"),
    nota: prop(page, "Nota de Claude"),
    propuestas: prop(page, "Propuestas de Claude") || [],
  };
}

export function mapBandeja(page) {
  return {
    id: page.id,
    url: page.url,
    titulo: prop(page, "Título"),
    tipo: prop(page, "Tipo"),
    estado: prop(page, "Estado"),
    tarea: prop(page, "Tarea") || [],
    enlace: prop(page, "Archivo o enlace"),
    donde: prop(page, "Dónde"),
    antes: prop(page, "Antes"),
    despues: prop(page, "Después"),
    revision: prop(page, "Revisión"),
    fecha: prop(page, "Fecha") || page.created_time,
    resultado: prop(page, "Resultado"),
  };
}

// Pasos = bloques to_do dentro de la página de la tarea.
export async function getPasos(pageId) {
  const data = await notion(`/blocks/${pageId}/children?page_size=100`);
  return data.results
    .filter((b) => b.type === "to_do")
    .map((b) => ({ id: b.id, texto: txt(b.to_do.rich_text), hecho: b.to_do.checked }));
}

// Texto plano del cuerpo de una página (para mostrar el briefing).
export async function getTexto(pageId) {
  const data = await notion(`/blocks/${pageId}/children?page_size=100`);
  return data.results
    .map((b) => {
      const c = b[b.type];
      const t = txt(c?.rich_text);
      if (!t) return null;
      if (b.type.startsWith("heading")) return { tipo: "titulo", t };
      if (b.type === "bulleted_list_item" || b.type === "numbered_list_item" || b.type === "to_do") return { tipo: "item", t };
      return { tipo: "p", t };
    })
    .filter(Boolean);
}

// Fecha de hoy en Caracas (UTC-4, sin horario de verano).
export function hoyCaracas() {
  return new Date(Date.now() - 4 * 3600 * 1000).toISOString().slice(0, 10);
}

export function diasHasta(fecha) {
  if (!fecha) return null;
  const a = new Date(hoyCaracas() + "T00:00:00Z");
  const b = new Date(fecha.slice(0, 10) + "T00:00:00Z");
  return Math.round((b - a) / 86400000);
}
