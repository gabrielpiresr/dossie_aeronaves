import type { AircraftDetailField, AircraftIncident } from '@/types/aircraft';

const DATE_PATTERN = /\b\d{2}\/\d{2}\/\d{4}\b/;

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&ccedil;/gi, 'ç')
    .replace(/&atilde;/gi, 'ã')
    .replace(/&otilde;/gi, 'õ')
    .replace(/&aacute;/gi, 'á')
    .replace(/&eacute;/gi, 'é')
    .replace(/&iacute;/gi, 'í')
    .replace(/&oacute;/gi, 'ó')
    .replace(/&uacute;/gi, 'ú');
}

function extractTextFromCell(cellHtml: string) {
  return decodeHtmlEntities(cellHtml.replace(/<[^>]*>/g, ' ').replace(/[\t\r\n ]+/g, ' ').trim());
}

function normalizeHeader(value: string, index: number) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized || `Coluna ${index + 1}`;
}

function scoreIncidentHeaders(headers: string[]) {
  const text = headers.join(' ').toLowerCase();
  let score = 0;

  if (text.includes('relat')) score += 2;
  if (text.includes('classifica')) score += 2;
  if (text.includes('ocorr')) score += 2;
  if (text.includes('uf')) score += 1;
  if (text.includes('data')) score += 1;

  return score;
}

export function extractIncidentsFromCenipaHtml(html: string): AircraftIncident[] {
  const rawText = extractTextFromCell(html).toLowerCase();

  if (
    rawText.includes('nenhum registro encontrado') ||
    rawText.includes('nenhum resultado encontrado') ||
    rawText.includes('não foram encontrados registros')
  ) {
    return [];
  }

  const tables = html.match(/<table[\s\S]*?<\/table>/gi) ?? [];

  let bestRows: AircraftIncident[] = [];
  let bestScore = -1;

  for (const tableHtml of tables) {
    const rows = tableHtml.match(/<tr[\s\S]*?<\/tr>/gi) ?? [];

    if (rows.length < 2) {
      continue;
    }

    const parsedRows = rows
      .map((rowHtml) => {
        const headerCells = Array.from(rowHtml.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)).map((match) =>
          extractTextFromCell(match[1]),
        );
        const dataCells = Array.from(rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)).map((match) => match[1]);
        const links = Array.from(rowHtml.matchAll(/<a[^>]*href=["']([^"']+)["'][^>]*>/gi)).map((match) => match[1]);

        return {
          headerCells,
          dataCells,
          links,
        };
      })
      .filter((row) => row.headerCells.length > 0 || row.dataCells.length > 0);

    if (!parsedRows.length) {
      continue;
    }

    const headerRow = parsedRows.find((row) => row.headerCells.length > 0);
    const headersSource = headerRow?.headerCells.length ? headerRow.headerCells : parsedRows[0].dataCells.map(extractTextFromCell);
    const headers = headersSource.map((value, index) => normalizeHeader(value, index));

    const incidents: AircraftIncident[] = [];

    for (const row of parsedRows) {
      if (!row.dataCells.length) {
        continue;
      }

      const values = row.dataCells.map(extractTextFromCell);
      const nonEmptyValues = values.filter(Boolean);

      if (!nonEmptyValues.length) {
        continue;
      }

      const rowText = nonEmptyValues.join(' ');
      const hasDateOrReportSignal = DATE_PATTERN.test(rowText) || rowText.toLowerCase().includes('relat');
      if (!hasDateOrReportSignal && values.length < 3) {
        continue;
      }

      const fields: AircraftDetailField[] = values
        .map((value, index) => ({
          label: headers[index] ?? `Coluna ${index + 1}`,
          value,
        }))
        .filter((field) => field.value.length > 0);

      if (fields.length === 0) {
        continue;
      }

      const link = row.links[0];
      incidents.push({
        link_relatorio: link,
        campos: fields,
      });
    }

    const tableScore = incidents.length + scoreIncidentHeaders(headers);

    if (incidents.length > 0 && tableScore > bestScore) {
      bestRows = incidents;
      bestScore = tableScore;
    }
  }

  return bestRows;
}
