import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Lancamento } from "./types";
import { brl, calc, isoToBr, num, pct, totais } from "./format";

const VERDE: [number, number, number] = [31, 92, 61];

export function gerarPdf(list: Lancamento[]): { blob: Blob; nome: string } {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const t = totais(list);
  const d0 = isoToBr(list[0].data), d1 = isoToBr(list[list.length - 1].data);

  doc.setFillColor(...VERDE); doc.rect(0, 0, W, 26, "F");
  doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(16);
  doc.text("Clínica Agromaxxi · Relatório de comissões", 14, 12);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  doc.text(`Período: ${d0} a ${d1}   ·   Emitido em ${new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}`, 14, 20);

  const boxes: [string, string][] = [["Lançamentos", String(list.length)], ["Valor total", brl(t.bruto)], ["Valor líquido", brl(t.liquido)]];
  const bw = (W - 28 - 8) / 3;
  boxes.forEach(([l, v], i) => {
    const x = 14 + i * (bw + 4), destaque = i === 2;
    doc.setDrawColor(220);
    if (destaque) doc.setFillColor(231, 238, 228); else doc.setFillColor(248, 247, 242);
    doc.roundedRect(x, 32, bw, 18, 2, 2, "FD");
    doc.setFontSize(8.5); doc.setTextColor(95); doc.text(l, x + 4, 38);
    doc.setFontSize(13); doc.setFont("helvetica", "bold");
    if (destaque) doc.setTextColor(...VERDE); else doc.setTextColor(30);
    doc.text(v, x + 4, 46); doc.setFont("helvetica", "normal");
  });

  autoTable(doc, {
    startY: 56,
    head: [["Data", "Qtde", "Descrição", "Valor unit.", "Valor total", "Comissão", "Líquido"]],
    body: list.map((e) => { const c = calc(e); return [isoToBr(e.data), num(e.qtde), e.descricao, brl(e.valor_unitario), brl(c.bruto), pct(e.comissao), brl(c.liquido)]; }),
    foot: [["", "", "TOTAL", "", brl(t.bruto), "", brl(t.liquido)]],
    styles: { fontSize: 8.5, cellPadding: 2, textColor: 30 },
    headStyles: { fillColor: VERDE, textColor: 255 },
    footStyles: { fillColor: [231, 238, 228], textColor: VERDE, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 247, 242] },
    columnStyles: {
      0: { cellWidth: 20 }, 1: { halign: "right", cellWidth: 13 }, 3: { halign: "right" }, 4: { halign: "right" },
      5: { halign: "right", cellWidth: 19 }, 6: { halign: "right", fontStyle: "bold" },
    },
    didDrawPage: () => {
      const H = doc.internal.pageSize.getHeight();
      doc.setFontSize(8); doc.setTextColor(140);
      doc.text(`Página ${doc.getNumberOfPages()}`, W - 14, H - 8, { align: "right" });
    },
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  let y = finalY + 22;
  if (y > 270) { doc.addPage(); y = 40; }
  doc.setDrawColor(120); doc.line(14, y, 90, y); doc.line(W - 90, y, W - 14, y);
  doc.setFontSize(9); doc.setTextColor(90);
  doc.text("Responsável pelo lançamento", 14, y + 5); doc.text("Validação", W - 90, y + 5);

  return { blob: doc.output("blob"), nome: `Comissoes_Agromaxxi_${d0.replace(/\//g, "-")}_a_${d1.replace(/\//g, "-")}.pdf` };
}

export function baixar(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
