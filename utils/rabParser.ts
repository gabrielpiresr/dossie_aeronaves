import type { AircraftDetailField } from '@/types/aircraft';

const FIELD_REGEX = /([A-ZÀ-ÿ0-9()/%.,\-\s]{3,}?):\s*\|\s*([^\n]+)/g;
const SEARCH_DATE_REGEX = /Consulta realizada em:\s*([^\n]+)/i;

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

function htmlToText(html: string) {
  const withoutScripts = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ');
  const withoutStyles = withoutScripts.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ');
  const withLineBreaks = withoutStyles
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n');

  const rawText = withLineBreaks.replace(/<[^>]+>/g, ' ');

  return decodeHtmlEntities(rawText)
    .replace(/\r/g, '\n')
    .replace(/\n\s+\n/g, '\n')
    .replace(/[\t ]+/g, ' ')
    .trim();
}

export function extractFieldsFromRabHtml(html: string): AircraftDetailField[] {
  const text = htmlToText(html);
  const fields: AircraftDetailField[] = [];
  const seen = new Set<string>();

  for (const match of text.matchAll(FIELD_REGEX)) {
    const label = match[1].trim().replace(/\s+/g, ' ');
    const value = match[2].trim().replace(/\s+/g, ' ');
    const normalizedKey = `${label.toLowerCase()}::${value.toLowerCase()}`;

    if (!label || !value || seen.has(normalizedKey)) {
      continue;
    }

    seen.add(normalizedKey);
    fields.push({ label, value });
  }

  return fields;
}

export function extractSearchTimestamp(html: string) {
  const text = htmlToText(html);
  const match = text.match(SEARCH_DATE_REGEX);

  return match?.[1]?.trim();
}
