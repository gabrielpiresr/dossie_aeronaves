export type AircraftRecord = {
  DATA_REGISTRO: string;
  MARCA: string;
  PROPRIETARIO: string | null;
  OPERADOR: string | null;
};

export type DetectedTransaction = {
  data_anterior: string;
  data_nova: string;
  proprietario_anterior: string;
  proprietario_novo: string;
  operador: string;
};
