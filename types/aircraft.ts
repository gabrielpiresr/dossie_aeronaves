export type SearchMode = 'matricula' | 'modelo' | 'fabricante';

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
  marca?: string;
  modelo?: string;
  fabricante?: string;
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

export type AircraftPhotoSnapshot = {
  registration: string;
  searchedModel: string | null;
  source: 'registration' | 'model';
  warning: string | null;
  sourceUrl: string;
  credits: string;
  photos: string[];
};

export type DistributionItem = {
  label: string;
  total: number;
};

export type IncidentClassificacao = 'ACIDENTE' | 'INCIDENTE' | 'INCIDENTE GRAVE';

export type IncidentCount = {
  classificacao: IncidentClassificacao;
  total: number;
};

export type IncidentDetail = {
  link: string | null;
  data: string | null;
  marca: string | null;
  classificacao: string | null;
  tipo: string | null;
  localidade: string | null;
  uf: string | null;
  aerodromo: string | null;
  operacao: string | null;
  status: string | null;
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
  ocorrencias: {
    totais_por_classificacao: IncidentCount[];
    relato_por_uf: StateDistributionItem[];
    relato_por_tipo: DistributionItem[];
  };
};

export type RegisteredAircraftRow = {
  marca: string;
  fabricante: string;
  modelo: string;
  ano_fabricacao: string;
  tipo_icao: string;
  categoria: string;
  tipo_motor: string;
  quantidade_motores: string;
  estado_operacao: string;
};

export type ModelConsolidatedMetrics = ConsolidatedMetrics & {
  aeronaves_registradas_atualmente: string[];
  aeronaves_registradas_detalhes: RegisteredAircraftRow[];
};

export type AircraftConsolidatedSnapshot = {
  marca_consultada: string;
  fabricante: string;
  modelo: string;
  consulta_realizada_em: string;
  fonte_url: string;
  fabricante_consolidado: ConsolidatedMetrics;
  modelo_consolidado: ModelConsolidatedMetrics;
  operador_consolidado: {
    operador_principal: string;
    operador_documento: string | null;
    aeronaves_registradas_detalhes: RegisteredAircraftRow[];
  };
  aeronave_consultada_ocorrencias: {
    totais_por_classificacao: IncidentCount[];
    historico: IncidentDetail[];
    possui_historico: boolean;
  };
  ocorrencias_detalhes_modelo: IncidentDetail[];
};
