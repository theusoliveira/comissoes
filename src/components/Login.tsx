"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { entrar } from "@/actions/auth";

export default function Login() {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    setErro(""); setCarregando(true);
    try {
      const { ok } = await entrar(senha);
      if (ok) router.refresh();
      else setErro("Senha incorreta.");
    } catch {
      setErro("Não foi possível entrar. Tente novamente.");
    } finally { setCarregando(false); }
  }

  return (
    <main className="login">
      <form className="card" onSubmit={submit}>
        <div>
          <h1>Comissões</h1>
          <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>Clínica Agromaxxi</p>
        </div>
        <div>
          <label htmlFor="senha">Senha</label>
          <input id="senha" type="password" autoComplete="current-password" required autoFocus value={senha} onChange={(e) => setSenha(e.target.value)} />
        </div>
        {erro && <div className="msg">{erro}</div>}
        <button className="primary" type="submit" disabled={carregando}>{carregando ? "Entrando…" : "Entrar"}</button>
      </form>
    </main>
  );
}
