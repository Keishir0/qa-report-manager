import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { TestReportData } from "@/types";

// Função para exportar para Excel
export function exportToExcel(reports: TestReportData[], filename?: string) {
  if (!reports || reports.length === 0) return;

  // 1. Criar dados da aba "Resumo"
  const resumoHeader = [
    "Código",
    "Data",
    "Sistema",
    "Branch",
    "Tela/Menu",
    "Funcionalidade",
    "Bug/Cenário testado",
    "Tipo de teste",
    "Status geral",
    "Observações",
  ];

  const resumoRows = reports.map((r) => [
    r.code,
    format(new Date(r.testDate), "dd/MM/yyyy"),
    r.systemName,
    r.branch,
    r.screenPath,
    r.functionality,
    r.bugDescription,
    r.testType,
    r.generalStatus,
    r.notes || "",
  ]);

  const resumoData = [resumoHeader, ...resumoRows];

  // 2. Criar dados da aba "Passos"
  const passosHeader = [
    "Código do teste",
    "Nº do passo",
    "Ação realizada",
    "Resultado esperado",
    "Resultado obtido",
    "Status do passo",
  ];

  const passosRows: any[][] = [];
  reports.forEach((r) => {
    if (r.steps && r.steps.length > 0) {
      r.steps.forEach((s) => {
        passosRows.push([
          r.code,
          s.stepNumber,
          s.action,
          s.expectedResult,
          s.actualResult,
          s.status,
        ]);
      });
    }
  });

  const passosData = [passosHeader, ...passosRows];

  // 3. Converter matrizes para planilhas
  const wsResumo = XLSX.utils.aoa_to_sheet(resumoData);
  const wsPassos = XLSX.utils.aoa_to_sheet(passosData);

  // 4. Ajustar largura das colunas dinamicamente
  const autoAdjustWidths = (data: any[][]) => {
    return data[0].map((_, colIdx) => {
      const maxLen = Math.max(
        ...data.map((row) => {
          const val = row[colIdx];
          return val !== undefined && val !== null ? val.toString().length : 0;
        })
      );
      return { wch: Math.max(maxLen + 3, 10) }; // Adiciona margem
    });
  };

  wsResumo["!cols"] = autoAdjustWidths(resumoData);
  wsPassos["!cols"] = autoAdjustWidths(passosData);

  // 5. Adicionar ao workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");
  XLSX.utils.book_append_sheet(wb, wsPassos, "Passos");

  // 6. Fazer download no browser
  const name = filename || `qa-report-${format(new Date(), "yyyy-MM-dd")}`;
  XLSX.writeFile(wb, `${name}.xlsx`);
}

// Função para exportar para PDF
export function exportToPDF(reports: TestReportData[], filename?: string) {
  if (!reports || reports.length === 0) return;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // Calcular período se houver mais de um relatório
  let periodText = "";
  if (reports.length > 1) {
    const dates = reports.map((r) => new Date(r.testDate).getTime());
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    periodText = `${format(minDate, "dd/MM/yyyy")} a ${format(maxDate, "dd/MM/yyyy")}`;
  }

  let y = 28; // Ponto inicial de conteúdo (abaixo do cabeçalho de 23mm)

  reports.forEach((report, index) => {
    // Se não for o primeiro relatório, verifica se cabe na página ou adiciona nova
    if (index > 0) {
      if (y > 185) {
        doc.addPage();
        y = 28;
      } else {
        // Separador visual entre relatórios
        doc.setDrawColor(220, 225, 230);
        doc.setLineWidth(0.4);
        doc.line(margin, y, pageWidth - margin, y);
        y += 8;
      }
    }

    // Bloco de Informações Gerais em 2 Colunas usando autoTable (estilo limpo)
    const generalData: any[][] = [
      [
        { content: `Código: ${report.code}`, styles: { fontStyle: "bold" as const, textColor: [30, 41, 59] as [number, number, number] } },
        { content: `Data: ${format(new Date(report.testDate), "dd/MM/yyyy")}`, styles: { textColor: [71, 85, 105] as [number, number, number] } },
      ],
      [
        { content: `Sistema: ${report.systemName}`, styles: { textColor: [71, 85, 105] as [number, number, number] } },
        { content: `Branch / Ambiente: ${report.branch}`, styles: { textColor: [71, 85, 105] as [number, number, number] } },
      ],
      [
        { content: `Tipo: ${report.testType}`, styles: { textColor: [71, 85, 105] as [number, number, number] } },
        { content: `Status Geral: ${report.generalStatus}`, styles: { fontStyle: "bold" as const, textColor: (report.generalStatus === "Passou" ? [22, 163, 74] : report.generalStatus === "Falhou" ? [220, 38, 38] : [217, 119, 6]) as [number, number, number] } },
      ],
      [
        { content: `Tela / Menu: ${report.screenPath}`, colSpan: 2, styles: { textColor: [71, 85, 105] as [number, number, number] } },
      ],
      [
        { content: `Funcionalidade: ${report.functionality}`, colSpan: 2, styles: { fontStyle: "bold" as const, textColor: [30, 41, 59] as [number, number, number] } },
      ],
      [
        { content: `Bug / Cenário:\n${report.bugDescription}`, colSpan: 2, styles: { textColor: [30, 41, 59] as [number, number, number] } },
      ],
    ];

    if (report.notes) {
      generalData.push([
        { content: `Observações:\n${report.notes}`, colSpan: 2, styles: { textColor: [100, 116, 139] as [number, number, number] } },
      ]);
    }

    autoTable(doc, {
      startY: y,
      body: generalData,
      theme: "plain",
      styles: {
        fontSize: 9,
        cellPadding: 2,
        valign: "top",
      },
      columnStyles: {
        0: { cellWidth: (pageWidth - margin * 2) / 2 },
        1: { cellWidth: (pageWidth - margin * 2) / 2 },
      },
      margin: { top: 30, bottom: 20, left: margin, right: margin },
    });

    y = (doc as any).lastAutoTable.finalY + 4;

    // Tabela de Passos
    const stepsHeaders = [["Nº", "Ação realizada", "Resultado esperado", "Resultado obtido", "Status"]];
    const stepsRows = (report.steps || []).map((s) => [
      s.stepNumber,
      s.action,
      s.expectedResult,
      s.actualResult,
      s.status,
    ]);

    autoTable(doc, {
      startY: y,
      head: stepsHeaders,
      body: stepsRows,
      theme: "striped",
      headStyles: {
        fillColor: [30, 58, 95], // Azul escuro (#1e3a5f)
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250], // Cinza claro (#f8f9fa)
      },
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
        valign: "middle",
      },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" as const },
        1: { cellWidth: 45 },
        2: { cellWidth: 45 },
        3: { cellWidth: 45 },
        4: { cellWidth: 25, halign: "center" as const },
      },
      margin: { top: 30, bottom: 20, left: margin, right: margin },
      didParseCell: (data) => {
        // Estilizar a coluna de Status ("Passou", "Falhou", "Bloqueado")
        if (data.section === "body" && data.column.index === 4) {
          const statusVal = data.cell.raw as string;
          data.cell.styles.fontStyle = "bold";
          if (statusVal === "Passou") {
            data.cell.styles.textColor = [34, 197, 94]; // Verde
          } else if (statusVal === "Falhou") {
            data.cell.styles.textColor = [239, 68, 68]; // Vermelho
          } else if (statusVal === "Bloqueado") {
            data.cell.styles.textColor = [245, 158, 11]; // Laranja
          } else {
            data.cell.styles.textColor = [100, 116, 139]; // Cinza
          }
        }
      },
    });

    y = (doc as any).lastAutoTable.finalY + 12;
  });

  // 7. Renderizar Cabeçalho e Rodapé em todas as páginas geradas
  const totalPages = doc.getNumberOfPages();
  const generationDate = format(new Date(), "dd/MM/yyyy HH:mm");

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Linha divisória e título do cabeçalho
    doc.setFontSize(14);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(30, 58, 95);
    doc.text("Relatório QA", margin, 14);

    // Informações secundárias do cabeçalho
    doc.setFontSize(8);
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(100, 116, 139);

    if (reports.length > 1 && periodText) {
      doc.text(`Período: ${periodText}`, margin, 19);
    }

    doc.text(`Gerado em: ${generationDate}`, pageWidth - margin - 35, 14);

    // Linha horizontal de cabeçalho
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    doc.line(margin, 22, pageWidth - margin, 22);

    // Rodapé
    doc.setFontSize(8);
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text(`Página ${i} de ${totalPages}`, margin, pageHeight - 10);
    doc.text("qa-report-manager v0.1.0", pageWidth - margin - 35, pageHeight - 10);
  }

  // 8. Fazer download do PDF no browser
  const name = filename || `qa-report-${format(new Date(), "yyyy-MM-dd")}`;
  doc.save(`${name}.pdf`);
}
