"use client";
import { useCallback, useEffect, useMemo, useState } from "react";

// ---------- utilidades ----------
const hoyCaracas = () => new Date(Date.now() - 4 * 3600 * 1000).toISOString().slice(0, 10);
const diasHasta = (f) => {
  if (!f) return null;
  const a = new Date(hoyCaracas() + "T00:00:00Z");
  const b = new Date(f.slice(0, 10) + "T00:00:00Z");
  return Math.round((b - a) / 86400000);
};
const pct = (t) => (t.estado === "Hecha" ? 100 : t.pasosTotales ? Math.round((t.pasosHechos / t.pasosTotales) * 100) : 0);
const saludo = () => {
  const h = new Date(Date.now() - 4 * 3600 * 1000).getUTCHours();
  return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
};
const fechaLarga = () =>
  new Date().toLocaleDateString("es-VE", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Caracas" });
const fechaCorta = (f) =>
  f ? new Date(f).toLocaleString("es-VE", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/Caracas" }) : "";
const PRIO = { Alta: 0, Media: 1, Baja: 2 };
const ESTADOS = ["Por hacer", "En curso", "Esperando aprobación", "Hecha", "Descartada"];

function vencimiento(t) {
  const d = diasHasta(t.fecha);
  if (d === null || t.estado === "Hecha") return null;
  if (d < 0) return { txt: `Venció hace ${-d} d`, nivel: "urgente" };
  if (d === 0) return { txt: "Vence hoy", nivel: "urgente" };
  if (d === 1) return { txt: "Vence mañana", nivel: "urgente" };
  if (d <= 3) return { txt: `En ${d} días`, nivel: "pronto" };
  return { txt: `En ${d} días`, nivel: null };
}

// ---------- anillo de avance ----------
function Ring({ value, size = 46, stroke = 5, big = false }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = value >= 100 ? "var(--green)" : value >= 50 ? "var(--accent)" : value > 0 ? "var(--gold)" : "var(--ring-track)";
  return (
    <div className={`ring ${big ? "big" : ""}`} style={{ width: size, height: size }} aria-label={`${value}% de avance`}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ring-track)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(value, 100) / 100)}
          style={{ transition: "stroke-dashoffset .5s ease" }}
        />
      </svg>
      <div className="pct">{value}%</div>
    </div>
  );
}

// ---------- tarjeta de tarea ----------
function Task({ t, onChange, onStep, toast }) {
  const [abierta, setAbierta] = useState(false);
  const v = vencimiento(t);
  const chipEstado = { "Esperando aprobación": "espera", "En curso": "curso" }[t.estado] || "";

  return (
    <div className={`task ${v?.nivel || ""}`}>
      <div className="task-head">
        <Ring value={pct(t)} />
        <div className="task-main">
          <button className="task-title" onClick={() => setAbierta(!abierta)} title="Ver pasos">
            {t.tarea}
          </button>
          <div className="chips">
            {v && <span className={`chip ${v.nivel === "urgente" ? "vence" : "media"}`}>{v.txt}</span>}
            {t.prioridad && <span className={`chip ${t.prioridad.toLowerCase()}`}>{t.prioridad}</span>}
            <span className={`chip ${chipEstado}`}>{t.estado}</span>
            {t.area && <span className="chip">{t.area}</span>}
            {t.fuente && <span className="chip">{t.fuente}</span>}
            {t.pasosTotales > 0 && <span className="chip">{t.pasosHechos}/{t.pasosTotales} pasos</span>}
          </div>
        </div>
      </div>

      {abierta && (
        <>
          {t.pasos?.length > 0 ? (
            <ul className="steps">
              {t.pasos.map((p) => (
                <li key={p.id} className={`step ${p.hecho ? "done" : ""}`} onClick={() => onStep(t, p, !p.hecho)}>
                  <input type="checkbox" checked={p.hecho} readOnly />
                  <span>{p.texto}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted" style={{ margin: "10px 0 0" }}>Sin pasos todavía. Puedes agregarlos como casillas en la página de Notion.</p>
          )}
          {t.nota && <div className="nota"><b>Claude:</b> {t.nota}</div>}
        </>
      )}

      <div className="task-meta">
        <label className="field">
          Entrega
          <input
            type="date"
            value={t.fecha ? t.fecha.slice(0, 10) : ""}
            onChange={(e) => {
              onChange(t, { fecha: e.target.value || null, ...(e.target.value && !t.recordatorios ? { recordatorios: true } : {}) });
              toast(e.target.value ? "Fecha guardada" : "Fecha eliminada");
            }}
          />
        </label>
        <button
          className={`bell ${t.recordatorios ? "on" : ""}`}
          onClick={() => onChange(t, { recordatorios: !t.recordatorios })}
          title="Recordatorios en el teléfono"
        >
          {t.recordatorios ? "🔔 Recordarme" : "🔕 Sin recordatorio"}
        </button>
        <label className="field">
          <select value={t.estado || ""} onChange={(e) => onChange(t, { estado: e.target.value })}>
            {ESTADOS.map((e) => <option key={e}>{e}</option>)}
          </select>
        </label>
        <span style={{ flex: 1 }} />
        <button className="link" style={{ background: "none", border: 0, cursor: "pointer", padding: 0 }} onClick={() => setAbierta(!abierta)}>
          {abierta ? "Ocultar pasos" : "Ver pasos"}
        </button>
        {t.enlace && <a className="link" href={t.enlace} target="_blank" rel="noreferrer">Origen ↗</a>}
        <a className="link" href={t.url} target="_blank" rel="noreferrer">Notion ↗</a>
      </div>
    </div>
  );
}

// ---------- cambio propuesto ----------
function Propuesta({ p, onDecide }) {
  return (
    <div className="prop">
      <div className="prop-title">{p.titulo}</div>
      {p.donde && <div className="muted">{p.donde}</div>}
      {(p.antes || p.despues) && (
        <div className="diff">
          {p.antes && <div className="antes">{p.antes}</div>}
          {p.despues && <div className="despues">{p.despues}</div>}
        </div>
      )}
      <div className="prop-actions">
        {p.estado === "Propuesta" && (
          <>
            <button className="btn ok sm" onClick={() => onDecide(p, "Aprobada")}>Aprobar</button>
            <button className="btn no sm" onClick={() => onDecide(p, "Rechazada")}>Rechazar</button>
          </>
        )}
        {p.estado === "Aprobada" && (
          <>
            <span className="muted">✓ Aprobada · se aplica en la próxima revisión</span>
            <button className="btn ghost sm" onClick={() => onDecide(p, "Propuesta")}>Deshacer</button>
          </>
        )}
        {p.estado === "Error" && <span className="muted" style={{ color: "var(--coral)" }}>No se pudo aplicar: {p.resultado}</span>}
        {p.enlace && <a className="link" href={p.enlace} target="_blank" rel="noreferrer">Abrir archivo ↗</a>}
      </div>
    </div>
  );
}

// ---------- nueva tarea ----------
function NuevaTarea({ onCreate, onCancel }) {
  const [tarea, setTarea] = useState("");
  const [fecha, setFecha] = useState("");
  const [prioridad, setPrioridad] = useState("Media");
  const [pasos, setPasos] = useState("");
  const [guardando, setGuardando] = useState(false);
  return (
    <form
      className="card newtask"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!tarea.trim()) return;
        setGuardando(true);
        await onCreate({ tarea, fecha: fecha || null, prioridad, pasos: pasos.split("\n") });
        setGuardando(false);
      }}
    >
      <input className="input" placeholder="¿Qué tienes que hacer?" value={tarea} onChange={(e) => setTarea(e.target.value)} autoFocus />
      <div className="row">
        <label className="field">Entrega <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></label>
        <label className="field">Prioridad
          <select value={prioridad} onChange={(e) => setPrioridad(e.target.value)}>
            <option>Alta</option><option>Media</option><option>Baja</option>
          </select>
        </label>
      </div>
      <textarea className="input" rows={3} placeholder="Pasos (uno por línea, opcional)" value={pasos} onChange={(e) => setPasos(e.target.value)} />
      <div className="row" style={{ justifyContent: "flex-end" }}>
        <button type="button" className="btn ghost" style={{ flex: "none" }} onClick={onCancel}>Cancelar</button>
        <button className="btn primary" style={{ flex: "none" }} disabled={guardando}>{guardando ? "Guardando…" : "Crear tarea"}</button>
      </div>
    </form>
  );
}

// ---------- página ----------
export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [vista, setVista] = useState("activas");
  const [agrupar, setAgrupar] = useState("prioridad");
  const [nueva, setNueva] = useState(false);
  const [msg, setMsg] = useState("");

  const toast = useCallback((m) => { setMsg(m); setTimeout(() => setMsg(""), 2200); }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await fetch("/api/data", { cache: "no-store" });
      if (res.status === 401) { window.location.href = "/login"; return; }
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
      setError("");
    } catch (e) {
      setError(e.message);
    }
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
    const id = setInterval(cargar, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [cargar]);

  // Actualización optimista de una tarea
  const patchTarea = (id, cambios) =>
    setData((d) => ({ ...d, tareas: d.tareas.map((t) => (t.id === id ? { ...t, ...cambios } : t)) }));

  async function cambiarTarea(t, cambios) {
    patchTarea(t.id, cambios);
    const res = await fetch(`/api/tasks/${t.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cambios),
    });
    if (!res.ok) { toast("No se pudo guardar. Reintentando…"); cargar(); }
  }

  async function marcarPaso(t, p, hecho) {
    const pasos = t.pasos.map((x) => (x.id === p.id ? { ...x, hecho } : x));
    const hechos = pasos.filter((x) => x.hecho).length;
    patchTarea(t.id, {
      pasos, pasosHechos: hechos, pasosTotales: pasos.length,
      ...(hecho ? { ultimoAvance: hoyCaracas() } : {}),
      ...(hechos > 0 && t.estado === "Por hacer" ? { estado: "En curso" } : {}),
    });
    if (hecho && hechos === pasos.length) toast("🎉 ¡Todos los pasos listos! Márcala como Hecha cuando la entregues.");
    const res = await fetch(`/api/steps/${p.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hecho, taskId: t.id }),
    });
    if (!res.ok) { toast("No se pudo guardar el paso"); cargar(); }
  }

  async function decidir(p, estado) {
    setData((d) => ({ ...d, propuestas: d.propuestas.map((x) => (x.id === p.id ? { ...x, estado } : x)).filter((x) => x.estado !== "Rechazada") }));
    const res = await fetch(`/api/inbox/${p.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ estado }),
    });
    if (!res.ok) { toast("No se pudo guardar"); cargar(); }
    else toast(estado === "Aprobada" ? "Aprobado: Claude lo aplica en la próxima revisión" : estado === "Rechazada" ? "Descartado" : "Listo");
  }

  async function crear(nuevaT) {
    const res = await fetch("/api/tasks", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(nuevaT),
    });
    if (res.ok) { setNueva(false); toast("Tarea creada"); cargar(); }
    else toast("No se pudo crear la tarea");
  }

  const tareas = data?.tareas || [];
  const activas = tareas.filter((t) => t.estado !== "Hecha" && t.estado !== "Descartada");
  const hechas = tareas.filter((t) => t.estado === "Hecha");
  const lista = vista === "activas" ? activas : hechas;

  const ordenadas = useMemo(() => {
    return [...lista].sort((a, b) => {
      const da = diasHasta(a.fecha), db = diasHasta(b.fecha);
      const ua = da !== null && da <= 2 ? 0 : 1, ub = db !== null && db <= 2 ? 0 : 1;
      if (ua !== ub) return ua - ub;
      return (a.orden ?? 99) - (b.orden ?? 99) || (PRIO[a.prioridad] ?? 3) - (PRIO[b.prioridad] ?? 3);
    });
  }, [lista]);

  const grupos = useMemo(() => {
    if (agrupar === "lista") return [["", ordenadas]];
    const key = agrupar === "prioridad" ? (t) => t.prioridad || "Sin prioridad" : agrupar === "area" ? (t) => t.area || "Sin área" : (t) => t.estado;
    const orderList = agrupar === "prioridad" ? ["Alta", "Media", "Baja", "Sin prioridad"] : null;
    const map = new Map();
    ordenadas.forEach((t) => { const k = key(t); if (!map.has(k)) map.set(k, []); map.get(k).push(t); });
    const entries = [...map.entries()];
    if (orderList) entries.sort((a, b) => orderList.indexOf(a[0]) - orderList.indexOf(b[0]));
    return entries;
  }, [ordenadas, agrupar]);

  const totalPasos = activas.reduce((s, t) => s + (t.pasosTotales || 0), 0);
  const pasosHechos = activas.reduce((s, t) => s + (t.pasosHechos || 0), 0);
  const avanceGeneral = totalPasos ? Math.round((pasosHechos / totalPasos) * 100) : 0;
  const porVencer = activas.filter((t) => { const d = diasHasta(t.fecha); return d !== null && d <= 2; }).length;
  const pendientesAprobar = (data?.propuestas || []).filter((p) => p.estado === "Propuesta").length;

  return (
    <main className="wrap">
      <header className="hero">
        <div>
          <h1>{saludo()}, Isa</h1>
          <div className="sub" style={{ textTransform: "capitalize" }}>{fechaLarga()}</div>
          <div className="stats">
            <span className="stat"><b>{activas.length}</b> activas</span>
            <span className="stat"><b>{porVencer}</b> por vencer</span>
            <span className="stat"><b>{pendientesAprobar}</b> para aprobar</span>
            <span className="stat"><b>{hechas.length}</b> hechas</span>
          </div>
        </div>
        <div className="hero-right">
          <div style={{ textAlign: "right" }}>
            <div className="muted">Avance general</div>
            <div style={{ fontWeight: 600 }}>{pasosHechos} de {totalPasos} pasos</div>
          </div>
          <Ring value={avanceGeneral} size={84} stroke={8} big />
        </div>
      </header>

      {error && <div className="card" style={{ marginBottom: 16, color: "var(--coral)" }}>No pude leer Notion: {error}</div>}

      <div className="grid">
        <section>
          <div className="toolbar">
            <div className="seg">
              <button className={vista === "activas" ? "on" : ""} onClick={() => setVista("activas")}>Activas</button>
              <button className={vista === "hechas" ? "on" : ""} onClick={() => setVista("hechas")}>Hechas</button>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <div className="seg">
                {[["prioridad", "Prioridad"], ["area", "Área"], ["estado", "Estado"], ["lista", "Orden"]].map(([k, l]) => (
                  <button key={k} className={agrupar === k ? "on" : ""} onClick={() => setAgrupar(k)}>{l}</button>
                ))}
              </div>
              <button className="btn sm" onClick={cargar} disabled={cargando} title="Actualizar">
                <span className={cargando ? "spin" : ""}>↻</span>
              </button>
              <button className="btn primary sm" onClick={() => setNueva(true)}>+ Tarea</button>
            </div>
          </div>

          {nueva && <NuevaTarea onCreate={crear} onCancel={() => setNueva(false)} />}

          {!data && !error && <div className="card empty">Cargando tus tareas…</div>}
          {data && lista.length === 0 && (
            <div className="card empty">{vista === "activas" ? "No tienes tareas activas. 🌿" : "Todavía no hay tareas hechas."}</div>
          )}

          {grupos.map(([nombre, items]) => (
            <div key={nombre || "todas"}>
              {nombre && <div className="group-label">{nombre} · {items.length}</div>}
              <div className="tasks">
                {items.map((t) => (
                  <Task key={t.id} t={t} onChange={cambiarTarea} onStep={marcarPaso} toast={toast} />
                ))}
              </div>
            </div>
          ))}
        </section>

        <aside className="side">
          {data?.propuestas?.length > 0 && (
            <div className="card">
              <h2 className="section-title">Para aprobar <span className="muted">{pendientesAprobar}</span></h2>
              {data.propuestas.map((p) => <Propuesta key={p.id} p={p} onDecide={decidir} />)}
            </div>
          )}

          {activas.some((t) => { const d = diasHasta(t.fecha); return d !== null && d <= 2; }) && (
            <div className="card">
              <h2 className="section-title">Entregas cercanas</h2>
              {activas
                .filter((t) => { const d = diasHasta(t.fecha); return d !== null && d <= 2; })
                .sort((a, b) => diasHasta(a.fecha) - diasHasta(b.fecha))
                .map((t) => (
                  <div key={t.id} className="alerta">
                    <b>{vencimiento(t)?.txt}</b> · {t.tarea} <span className="muted">({pct(t)}%)</span>
                  </div>
                ))}
            </div>
          )}

          <div className="card brief">
            <h2 className="section-title">
              Último briefing
              {data?.briefing && <a className="link" href={data.briefing.url} target="_blank" rel="noreferrer">Notion ↗</a>}
            </h2>
            {data?.briefing ? (
              <>
                <div className="muted" style={{ marginBottom: 8 }}>{data.briefing.revision} · {fechaCorta(data.briefing.fecha)}</div>
                {data.briefing.contenido?.length ? (
                  data.briefing.contenido.map((b, i) =>
                    b.tipo === "titulo" ? <div key={i} className="t">{b.t}</div>
                    : b.tipo === "item" ? <ul key={i}><li>{b.t}</li></ul>
                    : <p key={i}>{b.t}</p>
                  )
                ) : <p className="muted">{data.briefing.titulo}</p>}
              </>
            ) : (
              <p className="muted">El primer briefing llega con la próxima revisión de Claude (cada 2 horas, de 9:15 am a 10:46 pm).</p>
            )}
          </div>

          {data?.aplicadas?.length > 0 && (
            <div className="card">
              <h2 className="section-title">Cambios aplicados</h2>
              {data.aplicadas.map((p) => (
                <div key={p.id} style={{ marginBottom: 8, fontSize: 13.5 }}>
                  ✓ {p.titulo}
                  {p.resultado && <div className="muted">{p.resultado}</div>}
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>

      {msg && <div className="toast">{msg}</div>}
    </main>
  );
}
