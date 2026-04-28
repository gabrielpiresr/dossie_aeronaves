export type BrazilFeatureCollection = {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    properties: { sigla: string; name: string };
    geometry: {
      type: 'Polygon';
      coordinates: number[][][];
    };
  }>;
};

type Tile = {
  uf: string;
  name: string;
  top: number;
  left: number;
};

const BRAZIL_TILES: Tile[] = [
  { uf: 'RR', name: 'Roraima', top: 4, left: 29 },
  { uf: 'AP', name: 'Amapá', top: 9, left: 49 },
  { uf: 'AM', name: 'Amazonas', top: 15, left: 23 },
  { uf: 'PA', name: 'Pará', top: 18, left: 44 },
  { uf: 'AC', name: 'Acre', top: 25, left: 7 },
  { uf: 'RO', name: 'Rondônia', top: 28, left: 17 },
  { uf: 'TO', name: 'Tocantins', top: 34, left: 47 },
  { uf: 'MA', name: 'Maranhão', top: 32, left: 58 },
  { uf: 'PI', name: 'Piauí', top: 37, left: 64 },
  { uf: 'CE', name: 'Ceará', top: 37, left: 72 },
  { uf: 'RN', name: 'Rio Grande do Norte', top: 35, left: 81 },
  { uf: 'PB', name: 'Paraíba', top: 39, left: 82 },
  { uf: 'PE', name: 'Pernambuco', top: 43, left: 79 },
  { uf: 'AL', name: 'Alagoas', top: 46, left: 79 },
  { uf: 'SE', name: 'Sergipe', top: 49, left: 77 },
  { uf: 'BA', name: 'Bahia', top: 49, left: 66 },
  { uf: 'MT', name: 'Mato Grosso', top: 41, left: 35 },
  { uf: 'GO', name: 'Goiás', top: 49, left: 48 },
  { uf: 'DF', name: 'Distrito Federal', top: 52, left: 52 },
  { uf: 'MS', name: 'Mato Grosso do Sul', top: 56, left: 34 },
  { uf: 'MG', name: 'Minas Gerais', top: 59, left: 58 },
  { uf: 'ES', name: 'Espírito Santo', top: 63, left: 68 },
  { uf: 'RJ', name: 'Rio de Janeiro', top: 68, left: 65 },
  { uf: 'SP', name: 'São Paulo', top: 69, left: 56 },
  { uf: 'PR', name: 'Paraná', top: 77, left: 52 },
  { uf: 'SC', name: 'Santa Catarina', top: 83, left: 53 },
  { uf: 'RS', name: 'Rio Grande do Sul', top: 90, left: 48 },
];

const SCALE_X = 1.25;
const SCALE_Y = 1.35;
const HALF_WIDTH = 2.05;
const HALF_HEIGHT = 2.15;

function tileToPolygon({ top, left }: Tile): number[][][] {
  const cx = left * SCALE_X;
  const cy = (100 - top) * SCALE_Y;

  return [[
    [cx - HALF_WIDTH, cy - HALF_HEIGHT],
    [cx + HALF_WIDTH, cy - HALF_HEIGHT],
    [cx + HALF_WIDTH, cy + HALF_HEIGHT],
    [cx - HALF_WIDTH, cy + HALF_HEIGHT],
    [cx - HALF_WIDTH, cy - HALF_HEIGHT],
  ]];
}

export const brazilGeoJson: BrazilFeatureCollection = {
  type: 'FeatureCollection',
  features: BRAZIL_TILES.map((tile) => ({
    type: 'Feature',
    properties: {
      sigla: tile.uf,
      name: tile.name,
    },
    geometry: {
      type: 'Polygon',
      coordinates: tileToPolygon(tile),
    },
  })),
};

export const stateNameByUf = BRAZIL_TILES.reduce<Record<string, string>>((acc, tile) => {
  acc[tile.uf] = tile.name;
  return acc;
}, {});
