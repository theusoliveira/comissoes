"use client";

import { useCallback, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import * as repo from "@/actions/lancamentos";
import { sair } from "@/actions/auth";
import type { Lancamento, NovoLancamento } from "@/lib/types";
import { brToIso, brl, calc, isoToBr, normDesc, num, pct, todayIso, totais, weekday } from "@/lib/format";
import { maskDate, maskDecimal, maskMoney, parseDecimal, parseMoney } from "@/lib/masks";
import { SERVICOS } from "@/lib/servicos";
import Dialog, { type DialogState } from "./Dialog";

interface FormState { data: string; qtde: string; descricao: string; unit: string; comissao: string }
type Campo = keyof FormState;

const formVazio = (data = isoToBr(todayIso())): FormState => ({ data, qtde: "1", descricao: "", unit: "", comissao: "" });

function lerForm(f: FormState): NovoLancamento & { dataOk: boolean } {
  const iso = brToIso(f.data);
  return {
    dataOk: Boolean(iso), data: iso ?? "", qtde: parseDecimal(f.qtde), descricao: normDesc(f.descricao),
    valor_unitario: parseMoney(f.unit), comissao: parseDecimal(f.comissao),
  };
}

export default function Comissoes({ inicial }: { inicial: Lancamento[] }) {
  const router = useRouter();
  const [itens, setItens] = useState<Lancamento[]>(inicial);
  const [ocupado, setOcupado] = useState(false);
  const [form, setForm] = useState<FormState>(formVazio);
  const [erros, setErros] = useState<Partial<Record<Campo, boolean>>>({});
  const [msg, setMsg] = useState("");
  const [editando, setEditando] = useState<string | null>(null);
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [toast, setToast] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const avisar = useCallback((t: string) => { setToast(t); window.setTimeout(() => setToast(""), 2600); }, []);
  const falha = useCallback((e: unknown) => {
    console.error(e);
    router.refresh(); // se a sessão expirou, volta para a tela de senha
    setDialog({ title: "Algo deu errado", body: <p>Não foi possível falar com o banco de dados. Verifique a internet e tente de novo.</p>, buttons: [{ label: "Ok" }] });
  }, [router]);

  const recarregar = useCallback(async () => {
    try { setItens(await repo.listar()); } catch (e) { falha(e); }
  }, [falha]);

  /* ---------- filtro ---------- */
  const filtrados = useMemo(() => {
    const a = de.length === 10 ? brToIso(de) : null;
    const b = ate.length === 10 ? brToIso(ate) : null;
    return itens.filter((e) => (!a || e.data >= a) && (!b || e.data <= b)).sort((x, y) => x.data.localeCompare(y.data));
  }, [itens, de, ate]);
  const temFiltro = Boolean(de || ate);
  const t = totais(filtrados);

  const grupos = useMemo(() => {
    const g = new Map<string, Lancamento[]>();
    filtrados.forEach((e) => g.set(e.data, [...(g.get(e.data) ?? []), e]));
    return [...g.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtrados]);

  const sugestoes = useMemo(() => {
    const s = new Set(SERVICOS);
    itens.forEach((e) => s.add(e.descricao));
    return [...s].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [itens]);

  /* ---------- formulário ---------- */
  const set = (campo: Campo, valor: string) => {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErros((e) => ({ ...e, [campo]: false }));
  };

  const preencherUltimo = () => {
    if (editando) return;
    const k = normDesc(form.descricao);
    const ultimo = [...itens].reverse().find((e) => e.descricao === k);
    if (ultimo) setForm((f) => ({ ...f, unit: brl(ultimo.valor_unitario), comissao: `${num(ultimo.comissao)}%` }));
  };

  const prev = lerForm(form);
  const prevOk = prev.qtde > 0 && prev.valor_unitario >= 0 && prev.comissao >= 0;
  const prevCalc = prevOk ? calc(prev) : { bruto: 0, liquido: 0 };

  function limparForm() {
    setForm((f) => formVazio(f.data || undefined));
    setErros({}); setMsg(""); setEditando(null);
  }

  async function salvar(ev: FormEvent) {
    ev.preventDefault();
    const e = lerForm(form);
    const errs: string[] = [];
    const marca: Partial<Record<Campo, boolean>> = {};
    if (!e.dataOk) { errs.push("data inválida"); marca.data = true; }
    if (!(e.qtde > 0)) { errs.push("quantidade deve ser maior que zero"); marca.qtde = true; }
    if (!e.descricao) { errs.push("informe a descrição"); marca.descricao = true; }
    if (!(e.valor_unitario > 0)) { errs.push("informe o valor unitário"); marca.unit = true; }
    if (!(e.comissao >= 0 && e.comissao <= 100)) { errs.push("comissão entre 0% e 100%"); marca.comissao = true; }
    setErros(marca);
    if (errs.length) { setMsg(`Verifique: ${errs.join(", ")}.`); return; }

    const { dataOk: _ok, ...dados } = e;
    setOcupado(true);
    try {
      if (editando) {
        const novo = await repo.atualizar(editando, dados);
        setItens((l) => l.map((x) => (x.id === editando ? novo : x)));
        avisar("Lançamento atualizado");
      } else {
        const novo = await repo.inserir(dados);
        setItens((l) => [...l, novo]);
        avisar("Lançamento adicionado");
      }
      limparForm();
      descRef.current?.focus();
    } catch (err) { falha(err); } finally { setOcupado(false); }
  }

  function editar(e: Lancamento) {
    setEditando(e.id);
    setForm({ data: isoToBr(e.data), qtde: num(e.qtde), descricao: e.descricao, unit: brl(e.valor_unitario), comissao: `${num(e.comissao)}%` });
    setErros({}); setMsg("");
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ---------- exclusão ---------- */
  function pedirExclusao(e: Lancamento) {
    setDialog({
      title: "Excluir lançamento?",
      body: <p>{e.descricao} de {isoToBr(e.data)} ({brl(calc(e).liquido)}).</p>,
      buttons: [{ label: "Cancelar" }, {
        label: "Excluir", className: "danger solid", onClick: async () => {
          try {
            await repo.excluir([e.id]);
            setItens((l) => l.filter((x) => x.id !== e.id));
            if (editando === e.id) limparForm();
            avisar("Lançamento excluído");
          } catch (err) { falha(err); }
        },
      }],
    });
  }

  function pedirExcluirTodos() {
    const botoes: DialogState["buttons"] = [{ label: "Cancelar" }];
    if (temFiltro && filtrados.length && filtrados.length < itens.length) {
      botoes.push({
        label: `Só do período (${filtrados.length})`, className: "danger", onClick: async () => {
          try {
            const ids = filtrados.map((x) => x.id);
            for (let i = 0; i < ids.length; i += 500) await repo.excluir(ids.slice(i, i + 500));
            const set = new Set(ids);
            setItens((l) => l.filter((x) => !set.has(x.id)));
            limparForm(); avisar("Lançamentos excluídos");
          } catch (err) { falha(err); }
        },
      });
    }
    botoes.push({
      label: `Excluir todos (${itens.length})`, className: "danger solid", onClick: async () => {
        try { await repo.excluirTodos(); setItens([]); limparForm(); avisar("Lançamentos excluídos"); } catch (err) { falha(err); }
      },
    });
    setDialog({ title: "Excluir lançamentos?", body: <p>Essa ação não pode ser desfeita. Se quiser guardar uma cópia, exporte o Excel antes.</p>, buttons: botoes });
  }

  /* ---------- importação / exportação ---------- */
  async function importar(file: File) {
    try {
      const { lerPlanilha } = await import("@/lib/planilha");
      const rows = await lerPlanilha(file);
      if (!rows.length) {
        setDialog({ title: "Nada para importar", body: <p>Não encontrei lançamentos. A planilha precisa das colunas DATA, QTDE, DESCRIÇÃO, VALOR UNITÁRIO e COMISSÃO.</p>, buttons: [{ label: "Ok" }] });
        return;
      }
      const tt = rows.reduce((s, e) => { const c = calc(e); return { b: s.b + c.bruto, l: s.l + c.liquido }; }, { b: 0, l: 0 });
      const datas = rows.map((r) => r.data).sort();
      const executar = async (substituir: boolean) => {
        setOcupado(true);
        try {
          if (substituir) await repo.excluirTodos();
          for (let i = 0; i < rows.length; i += 500) await repo.inserirVarios(rows.slice(i, i + 500));
          await recarregar();
          avisar(`${rows.length} lançamentos importados`);
        } catch (err) { falha(err); } finally { setOcupado(false); }
      };
      const botoes: DialogState["buttons"] = [{ label: "Cancelar" }];
      if (itens.length) botoes.push({ label: "Substituir os atuais", className: "danger", onClick: () => executar(true) });
      botoes.push({ label: itens.length ? "Adicionar aos atuais" : "Importar", className: "primary", onClick: () => executar(false) });
      setDialog({
        title: "Importar planilha",
        body: <p>Encontrei <b>{rows.length}</b> lançamentos de {isoToBr(datas[0])} a {isoToBr(datas[datas.length - 1])}.<br />Total {brl(tt.b)} · Líquido <b>{brl(tt.l)}</b>.</p>,
        buttons: botoes,
      });
    } catch {
      setDialog({ title: "Não consegui ler o arquivo", body: <p>Confira se é uma planilha Excel (.xlsx) válida.</p>, buttons: [{ label: "Ok" }] });
    }
  }

  async function exportarPdf() {
    if (!filtrados.length) return;
    const { gerarPdf, baixar } = await import("@/lib/pdf");
    const { blob, nome } = gerarPdf(filtrados);
    baixar(blob, nome);
  }

  async function exportarExcel() {
    if (!filtrados.length) return;
    const [{ exportarPlanilha }, { baixar }] = await Promise.all([import("@/lib/planilha"), import("@/lib/pdf")]);
    const d0 = isoToBr(filtrados[0].data).replace(/\//g, "-"), d1 = isoToBr(filtrados[filtrados.length - 1].data).replace(/\//g, "-");
    baixar(exportarPlanilha(filtrados), `Comissoes_Agromaxxi_${d0}_a_${d1}.xlsx`);
  }

  /* ---------- render ---------- */
  return (
    <div className="wrap">
      <header className="top">
        <div>
          <h1>Comissões</h1>
          <p>Clínica Agromaxxi · <button className="link" onClick={async () => { await sair(); router.refresh(); }}>sair</button></p>
        </div>
        <div className="actions">
          <button onClick={() => fileRef.current?.click()} disabled={ocupado}>Importar planilha</button>
          <button onClick={exportarExcel} disabled={!filtrados.length}>Exportar Excel</button>
          <button className="primary" onClick={exportarPdf} disabled={!filtrados.length}>Gerar PDF</button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.xlsm,.csv" hidden
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void importar(f); }} />
        </div>
      </header>

      <div className="totals">
        <div><small>Lançamentos</small><strong>{filtrados.length}</strong></div>
        <div><small>Valor total</small><strong>{brl(t.bruto)}</strong></div>
        <div className="net"><small>Valor líquido (comissão)</small><strong>{brl(t.liquido)}</strong></div>
      </div>

      <form ref={formRef} className="card" onSubmit={salvar} autoComplete="off" noValidate>
        <div className="formgrid">
          <div>
            <label htmlFor="fData">Data</label>
            <input id="fData" inputMode="numeric" placeholder="dd/mm/aaaa" maxLength={10} className={erros.data ? "err" : ""}
              value={form.data} onChange={(e) => set("data", maskDate(e.target.value))} />
          </div>
          <div>
            <label htmlFor="fQtde">Qtde</label>
            <input id="fQtde" inputMode="decimal" placeholder="1" className={erros.qtde ? "err" : ""}
              value={form.qtde} onChange={(e) => set("qtde", maskDecimal(e.target.value))} />
          </div>
          <div className="full">
            <label htmlFor="fDesc">Descrição</label>
            <input id="fDesc" ref={descRef} list="servicos" placeholder="Ex.: CONSULTAS" maxLength={120} className={erros.descricao ? "err" : ""}
              value={form.descricao} onChange={(e) => set("descricao", e.target.value.toUpperCase())} onBlur={preencherUltimo} />
            <datalist id="servicos">{sugestoes.map((s) => <option key={s} value={s} />)}</datalist>
          </div>
          <div>
            <label htmlFor="fUnit">Valor unitário</label>
            <input id="fUnit" inputMode="numeric" placeholder="R$ 0,00" className={erros.unit ? "err" : ""}
              value={form.unit} onChange={(e) => set("unit", maskMoney(e.target.value))} />
          </div>
          <div>
            <label htmlFor="fCom">Comissão</label>
            <input id="fCom" inputMode="decimal" placeholder="0%" className={erros.comissao ? "err" : ""}
              value={form.comissao}
              onChange={(e) => {
                const prevVal = form.comissao, v = e.target.value;
                const apagouSufixo = prevVal.endsWith("%") && !v.endsWith("%") && v.length < prevVal.length;
                const base = maskDecimal(apagouSufixo ? v.slice(0, -1) : v);
                set("comissao", base ? `${base}%` : "");
              }} />
            <div className="chips">
              {[5, 25, 40, 100].map((p) => <button key={p} type="button" onClick={() => set("comissao", `${p}%`)}>{p}%</button>)}
            </div>
          </div>
        </div>
        <div className="msg" role="alert">{msg}</div>
        <div className="preview">
          <div><span>Total </span><b>{brl(prevCalc.bruto)}</b> · <span>Líquido </span><b>{brl(prevCalc.liquido)}</b></div>
          <div className="actions">
            {editando && <button type="button" onClick={limparForm}>Cancelar edição</button>}
            <button type="submit" className="primary" disabled={ocupado}>{editando ? "Salvar alteração" : "Adicionar lançamento"}</button>
          </div>
        </div>
      </form>

      <div className="listhead">
        <h2 style={{ fontSize: "1.3rem" }}>Lançamentos</h2>
        <div className="filters">
          <label htmlFor="de">De</label>
          <input id="de" inputMode="numeric" placeholder="dd/mm/aaaa" maxLength={10} value={de} onChange={(e) => setDe(maskDate(e.target.value))} />
          <label htmlFor="ate">até</label>
          <input id="ate" inputMode="numeric" placeholder="dd/mm/aaaa" maxLength={10} value={ate} onChange={(e) => setAte(maskDate(e.target.value))} />
          <button className="danger" onClick={pedirExcluirTodos} disabled={!itens.length || ocupado}>Excluir todos</button>
        </div>
      </div>

      {!filtrados.length ? <div className="empty">{itens.length ? "Nenhum lançamento nesse período." : "Nenhum lançamento ainda. Adicione acima ou importe sua planilha."}</div>
        : grupos.map(([data, lista]) => (
          <section className="day" key={data}>
            <h3><span>{isoToBr(data)} · {weekday(data)}</span><span>{brl(totais(lista).liquido)}</span></h3>
            {lista.map((e) => {
              const c = calc(e);
              return (
                <div key={e.id} className={`row${e.id === editando ? " editing" : ""}`}>
                  <div>
                    <div className="desc">{e.descricao}</div>
                    <div className="meta">{num(e.qtde)} × {brl(e.valor_unitario)} · {pct(e.comissao)}</div>
                  </div>
                  <div className="val"><span className="meta">{brl(c.bruto)}</span><b>{brl(c.liquido)}</b></div>
                  <div className="btns">
                    <button onClick={() => editar(e)}>Editar</button>
                    <button className="danger" onClick={() => pedirExclusao(e)}>Excluir</button>
                  </div>
                </div>
              );
            })}
          </section>
        ))}

      <Dialog state={dialog} onClose={() => setDialog(null)} />
      <div className={`toast${toast ? " show" : ""}`} role="status">{toast}</div>
    </div>
  );
}
