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
