import * as XLSX from "xlsx";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { TestReportData } from "@/types";

type ExcelTableLayout = {
  sheetPath: string;
  relsPath: string;
  tablePath: string;
  tableId: number;
  tableName: string;
  headers: string[];
  rowCount: number;
  columnCount: number;
  wrappedColumns: Set<number>;
  blankRows?: Set<number>;
};

const XLSX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function columnName(index: number) {
  let value = index + 1;
  let name = "";

  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }

  return name;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function estimateRowHeight(row: any[], widths: number[], wrapColumns: number[]) {
  const maxLines = wrapColumns.reduce((max, columnIndex) => {
    const value = row[columnIndex];
    const text = value === undefined || value === null ? "" : String(value);
    const explicitLines = text.split(/\r\n|\r|\n/);
    const wrappedLines = explicitLines.reduce((total, line) => {
      const width = widths[columnIndex] || 20;
      return total + Math.max(1, Math.ceil(line.length / Math.max(width - 4, 12)));
    }, 0);

    return Math.max(max, wrappedLines);
  }, 1);

  return Math.min(Math.max(18, maxLines * 15), 150);
}

function applyWorksheetRows(
  worksheet: XLSX.WorkSheet,
  data: any[][],
  widths: number[],
  wrapColumns: number[],
  headerHeight = 24
) {
  worksheet["!rows"] = data.map((row, index) => ({
    hpt: index === 0 ? headerHeight : estimateRowHeight(row, widths, wrapColumns),
  }));
}

function buildOpenXmlStyles() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <numFmts count="1"><numFmt numFmtId="56" formatCode="&quot;上午/下午 &quot;hh&quot;時&quot;mm&quot;分&quot;ss&quot;秒 &quot;"/></numFmts>
  <fonts count="2">
    <font><sz val="12"/><color theme="1"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>
    <font><b/><sz val="12"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>
  </fonts>
  <fills count="4">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF1F4E78"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFDDEBF7"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border><left style="thin"><color rgb="FFB4C6E7"/></left><right style="thin"><color rgb="FFB4C6E7"/></right><top style="thin"><color rgb="FFB4C6E7"/></top><bottom style="thin"><color rgb="FFB4C6E7"/></bottom><diagonal/></border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="6">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="top" wrapText="1"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
  <dxfs count="0"/>
  <tableStyles count="1" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleMedium4"/>
</styleSheet>`;
}

function styleIndexForCell(layout: ExcelTableLayout, column: number, row: number) {
  if (row === 1) return 1;
  if (layout.blankRows?.has(row)) return 0;

  const isStripedRow = row % 2 === 0;
  const isWrappedColumn = layout.wrappedColumns.has(column);

  if (isWrappedColumn) return isStripedRow ? 5 : 3;
  return isStripedRow ? 4 : 2;
}

function applyCellStyles(sheetXml: string, layout: ExcelTableLayout) {
  return sheetXml.replace(
    /<c\b([^>]*\br="([A-Z]+)(\d+)"[^>]*)>/g,
    (match, attributes, columnLetters, rowText) => {
      const column = XLSX.utils.decode_col(columnLetters);
      const row = Number(rowText);
      const styleIndex = styleIndexForCell(layout, column, row);
      const cleanAttributes = attributes.replace(/\s+s="\d+"/g, "");

      if (styleIndex === 0) {
        return `<c${cleanAttributes}>`;
      }

      return `<c${cleanAttributes} s="${styleIndex}">`;
    }
  );
}

function freezeFirstRow(sheetXml: string) {
  const frozenView =
    '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft"/></sheetView></sheetViews>';

  if (sheetXml.includes("<sheetViews>")) {
    return sheetXml.replace(/<sheetViews>.*?<\/sheetViews>/, frozenView);
  }

  return sheetXml.replace("<sheetData>", `${frozenView}<sheetData>`);
}

function addTablePartToSheet(sheetXml: string, relationshipId: string) {
  const tablePart = `<tableParts count="1"><tablePart r:id="${relationshipId}"/></tableParts>`;

  if (sheetXml.includes("<tableParts")) return sheetXml;

  return sheetXml.replace("</worksheet>", `${tablePart}</worksheet>`);
}

function buildTableXml(layout: ExcelTableLayout) {
  const finalColumn = columnName(layout.columnCount - 1);
  const ref = `A1:${finalColumn}${layout.rowCount}`;
  const columns = layout.headers
    .map(
      (header, index) =>
        `<tableColumn id="${index + 1}" name="${escapeXml(header)}"/>`
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<table xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" id="${layout.tableId}" name="${layout.tableName}" displayName="${layout.tableName}" ref="${ref}" totalsRowShown="0">
  <autoFilter ref="${ref}"/>
  <tableColumns count="${layout.columnCount}">${columns}</tableColumns>
  <tableStyleInfo name="TableStyleMedium2" showFirstColumn="0" showLastColumn="0" showRowStripes="1" showColumnStripes="0"/>
</table>`;
}

function addTableContentType(contentTypesXml: string, tablePath: string) {
  const partName = `/${tablePath}`;

  if (contentTypesXml.includes(`PartName="${partName}"`)) {
    return contentTypesXml;
  }

  return contentTypesXml.replace(
    "</Types>",
    `<Override PartName="${partName}" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml"/></Types>`
  );
}

function buildSheetRelationshipXml(target: string) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/table" Target="${target}"/></Relationships>`;
}

function styleWorkbook(buffer: ArrayBuffer, layouts: ExcelTableLayout[]) {
  const zip = unzipSync(new Uint8Array(buffer));

  zip["xl/styles.xml"] = strToU8(buildOpenXmlStyles());

  layouts.forEach((layout) => {
    const relationshipId = "rId1";
    const tableTarget = `../tables/table${layout.tableId}.xml`;
    const sheetXml = strFromU8(zip[layout.sheetPath]);

    zip[layout.sheetPath] = strToU8(
      addTablePartToSheet(
        applyCellStyles(freezeFirstRow(sheetXml), layout),
        relationshipId
      )
    );
    zip[layout.relsPath] = strToU8(buildSheetRelationshipXml(tableTarget));
    zip[layout.tablePath] = strToU8(buildTableXml(layout));
    zip["[Content_Types].xml"] = strToU8(
      addTableContentType(strFromU8(zip["[Content_Types].xml"]), layout.tablePath)
    );
  });

  return zipSync(zip, { level: 6 });
}

function downloadXlsxFile(data: Uint8Array, filename: string) {
  const arrayBuffer = new ArrayBuffer(data.byteLength);
  new Uint8Array(arrayBuffer).set(data);

  const blob = new Blob([arrayBuffer], { type: XLSX_MIME_TYPE });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// Função para exportar para Excel
export function exportToExcel(reports: TestReportData[], filename?: string) {
  if (!reports || reports.length === 0) return;

  // 1. Criar dados da aba "Resumo"
  const resumoHeader = [
    "Código",
    "Data",
    "QA",
    "Dev",
    "Status geral",
    "Tipo de teste",
    "Sistema",
    "Branch",
    "Tela/Menu",
    "Funcionalidade",
    "Bug/Cenário testado",
    "Observações",
  ];

  const resumoRows = reports.map((r) => [
    r.code,
    format(new Date(r.testDate), "dd/MM/yyyy"),
    r.testerName || "Não informado",
    r.sndeskTechnicianName || "Não informado",
    r.generalStatus,
    r.testType,
    r.systemName,
    r.branch,
    r.screenPath,
    r.functionality,
    r.bugDescription,
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
  const passosBlankRows = new Set<number>();
  reports.forEach((r) => {
    if (!r.steps || r.steps.length === 0) return;

    if (passosRows.length > 0) {
      passosRows.push(["", "", "", "", "", ""]);
      passosBlankRows.add(passosRows.length + 1);
    }

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
  });

  const passosData = [passosHeader, ...passosRows];

  // 3. Converter matrizes para planilhas
  const wsResumo = XLSX.utils.aoa_to_sheet(resumoData);
  const wsPassos = XLSX.utils.aoa_to_sheet(passosData);

  // 4. Ajustar largura, altura e layout das colunas
  const resumoWidths = [12, 14, 18, 22, 18, 16, 22, 16, 25, 40, 60, 45];
  const passosWidths = [16, 12, 55, 55, 55, 18];

  wsResumo["!cols"] = resumoWidths.map((wch) => ({ wch }));
  wsPassos["!cols"] = passosWidths.map((wch) => ({ wch }));
  applyWorksheetRows(wsResumo, resumoData, resumoWidths, [8, 9, 10, 11]);
  applyWorksheetRows(wsPassos, passosData, passosWidths, [2, 3, 4]);

  // 5. Adicionar ao workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");
  XLSX.utils.book_append_sheet(wb, wsPassos, "Passos");

  // 6. Fazer download no browser
  const name = filename || `qa-report-${format(new Date(), "yyyy-MM-dd")}`;
  const workbookBuffer = XLSX.write(wb, {
    bookType: "xlsx",
    compression: true,
    type: "array",
  }) as ArrayBuffer;
  const styledWorkbook = styleWorkbook(workbookBuffer, [
    {
      sheetPath: "xl/worksheets/sheet1.xml",
      relsPath: "xl/worksheets/_rels/sheet1.xml.rels",
      tablePath: "xl/tables/table1.xml",
      tableId: 1,
      tableName: "TabelaResumo",
      headers: resumoHeader,
      rowCount: resumoData.length,
      columnCount: resumoHeader.length,
      wrappedColumns: new Set([8, 9, 10, 11]),
    },
    {
      sheetPath: "xl/worksheets/sheet2.xml",
      relsPath: "xl/worksheets/_rels/sheet2.xml.rels",
      tablePath: "xl/tables/table2.xml",
      tableId: 2,
      tableName: "TabelaPassos",
      headers: passosHeader,
      rowCount: passosData.length,
      columnCount: passosHeader.length,
      wrappedColumns: new Set([2, 3, 4]),
      blankRows: passosBlankRows,
    },
  ]);

  downloadXlsxFile(styledWorkbook, `${name}.xlsx`);
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
        { content: `Status Geral: ${report.generalStatus}`, styles: { fontStyle: "bold" as const, textColor: (["Aprovado QA", "Passou"].includes(report.generalStatus) ? [22, 163, 74] : ["Reprovado QA", "Falhou", "Bloqueado"].includes(report.generalStatus) ? [220, 38, 38] : [100, 116, 139]) as [number, number, number] } },
      ],
      [
        { content: `Dev: ${report.sndeskTechnicianName || "Não informado"}`, styles: { textColor: [71, 85, 105] as [number, number, number] } },
        { content: `QA: ${report.testerName || "Não informado"}`, styles: { textColor: [71, 85, 105] as [number, number, number] } },
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
          if (["Aprovado QA", "Passou"].includes(statusVal)) {
            data.cell.styles.textColor = [34, 197, 94]; // Verde
          } else if (["Reprovado QA", "Falhou", "Bloqueado"].includes(statusVal)) {
            data.cell.styles.textColor = [239, 68, 68]; // Vermelho
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
