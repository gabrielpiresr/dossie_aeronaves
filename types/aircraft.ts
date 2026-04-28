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

export type AircraftIncident = {
  link_relatorio?: string;
  campos: AircraftDetailField[];
};

export type AircraftRabSnapshot = {
  marca: string;
  consulta_realizada_em?: string;
  fonte_url: string;
  campos: AircraftDetailField[];
  fonte_cenipa_url?: string;
  incidentes: AircraftIncident[];
  incidentes_consulta_erro?: string;
};
