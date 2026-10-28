"use client";
import { useState } from "react";

export default function Login() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.ok) window.location.href = "/";
    else setError("Contraseña incorrecta");
  }

  return (
    <main className="login">
      <form className="card" onSubmit={entrar}>
        <div style={{ fontSize: 40 }}>🎯</div>
        <h1>Mis tareas</h1>
        <p className="muted" style={{ marginTop: 0 }}>Dashboard personal de Isa</p>
        <input
          className="input"
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
        <button className="btn primary" style={{ width: "100%", justifyContent: "center", marginTop: 12 }} disabled={loading}>
          {loading ? "Entrando…" : "Entrar"}
        </button>
        {error && <div className="err">{error}</div>}
      </form>
    </main>
  );
}
