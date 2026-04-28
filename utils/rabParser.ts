import type { AircraftDetailField } from '@/types/aircraft';

const SEARCH_DATE_REGEX = /Consulta realizada em:\s*([^\n]+)/i;
const DETAIL_LINK_REGEX = /href=["']([^"']*cons_rab_resposta\.asp[^"']*)["']/gi;

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
    .replace(/&uacute;/gi, 'ú')
    .replace(/&Atilde;/g, 'Ã')
    .replace(/&Ccedil;/g, 'Ç');
}

function normalizeWhitespace(value: string) {
  return decodeHtmlEntities(value).replace(/[\t ]+/g, ' ').replace(/\u00a0/g, ' ').trim();
}

function htmlToRows(html: string) {
  const withoutScripts = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ');
  const withoutStyles = withoutScripts.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ');

  const tableText = withoutStyles
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(td|th)>/gi, '\t')
    .replace(/<\/(tr|p|div|li|h1|h2|h3|h4|h5|h6)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\r/g, '\n');

  return tableText
    .split('\n')
    .map((line) => line.split('\t').map((cell) => normalizeWhitespace(cell)).filter(Boolean))
    .filter((cells) => cells.length > 0);
}

function addField(fields: AircraftDetailField[], seen: Set<string>, label: string, value: string) {
  const normalizedLabel = normalizeWhitespace(label).replace(/:+$/, '');
  const normalizedValue = normalizeWhitespace(value);

  if (!normalizedLabel || !normalizedValue) {
    return;
  }

  const key = `${normalizedLabel.toLowerCase()}::${normalizedValue.toLowerCase()}`;
  if (seen.has(key)) {
    return;
  }

  seen.add(key);
  fields.push({ label: normalizedLabel, value: normalizedValue });
}

function extractPairFromSingleCell(cell: string) {
  const match = cell.match(/^([^:]{3,}?):\s*(.+)$/);
  if (!match) {
    return null;
  }

  return {
    label: match[1],
    value: match[2],
  };
}

export function extractFieldsFromRabHtml(html: string): AircraftDetailField[] {
  const rows = htmlToRows(html);
  const fields: AircraftDetailField[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < rows.length; index += 1) {
    const cells = rows[index];

    if (cells.length === 1) {
      const single = extractPairFromSingleCell(cells[0]);
      if (single) {
        addField(fields, seen, single.label, single.value);
      }

      if (index + 1 < rows.length && rows[index + 1].length === 1 && /:$/u.test(cells[0])) {
        addField(fields, seen, cells[0], rows[index + 1][0]);
      }

      continue;
    }

    if (cells.length === 2) {
      addField(fields, seen, cells[0], cells[1]);
      continue;
    }

    const isOwnerHeader = cells.some((cell) => /propriet[áa]rio/i.test(cell)) && cells.some((cell) => /cpf\/cnpj/i.test(cell));

    if (isOwnerHeader) {
      let ownerRowNumber = 1;
      for (let j = index + 1; j < rows.length; j += 1) {
        const row = rows[j];

        if (row.length < 2 || /informa[çc][õo]es da aeronave/i.test(row.join(' '))) {
          break;
        }

        const pairValues = cells
          .map((header, headerIndex) => `${header}: ${row[headerIndex] ?? '-'}`)
          .join(' | ');
        addField(fields, seen, `Proprietário ${ownerRowNumber}`, pairValues);
        ownerRowNumber += 1;
      }

      continue;
    }

    addField(fields, seen, cells[0], cells.slice(1).join(' | '));
  }

  return fields;
}

export function extractSearchTimestamp(html: string) {
  const text = htmlToRows(html).flat().join('\n');
  const match = text.match(SEARCH_DATE_REGEX);

  return match?.[1]?.trim();
}

export function extractDetailLinksFromSearchHtml(html: string, baseUrl: string) {
  const links = new Set<string>();

  for (const match of html.matchAll(DETAIL_LINK_REGEX)) {
    const href = decodeHtmlEntities(match[1].trim());

    try {
      const absoluteUrl = new URL(href, `${baseUrl}/`).toString();
      links.add(absoluteUrl);
    } catch {
      // ignora links inválidos
    }
  }

  return [...links];
}
