export type AircraftRecord = {
  data_registro: string;
  marca: string;
  proprietario: string | null;
  operador: string | null;
};

export type DetectedTransaction = {
  data_anterior: string;
  data_nova: string;
  proprietario_anterior: string;
  proprietario_novo: string;
  operador: string;
};

export type AircraftDetailField = {
  label: string;
  value: string;
};

export type AircraftRabSnapshot = {
  marca: string;
  consulta_realizada_em?: string;
  fonte_url: string;
  campos: AircraftDetailField[];
};

export type DistributionItem = {
  label: string;
  total: number;
};

export type StateDistributionItem = {
  estado: string;
  regiao: string;
  total: number;
};

export type RegionDistributionItem = {
  regiao: string;
  total: number;
};

export type ConsolidatedMetrics = {
  quantidade_aeronaves_registradas: number;
  distribuicao_modelo: DistributionItem[];
  distribuicao_ano: DistributionItem[];
  negociacoes_desde_2017: number;
  media_negociacoes_por_ano_desde_2017: number;
  negociacoes_ultimos_12_meses: number;
  tempo_medio_permanencia_dias: number;
  mapa_brasil: {
    por_estado: StateDistributionItem[];
    por_regiao: RegionDistributionItem[];
  };
};

export type ModelConsolidatedMetrics = ConsolidatedMetrics & {
  aeronaves_registradas_atualmente: string[];
};

export type AircraftConsolidatedSnapshot = {
  marca_consultada: string;
  fabricante: string;
  modelo: string;
  consulta_realizada_em: string;
  fonte_url: string;
  fabricante_consolidado: ConsolidatedMetrics;
  modelo_consolidado: ModelConsolidatedMetrics;
};
