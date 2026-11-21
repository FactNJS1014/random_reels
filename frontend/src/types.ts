export interface CommonRandom {
  id: number;
  numbers: string[];
  resultNumber: string | null;
  totalBalls: number;
  spinSeconds: number;
  createdAt: string;
  updatedAt: string | null;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateDrawPayload {
  numbers: string[];
  resultNumber: string;
  totalBalls: number;
  spinSeconds: number;
}
