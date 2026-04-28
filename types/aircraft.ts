export type AircraftTransaction = {
  id: string;
  date: string;
  description: string;
};

export type AircraftHistoryData = {
  registration: string;
  model?: string;
  manufacturer?: string;
  transactions: AircraftTransaction[];
};
