import type { CreateDrawPayload, CommonRandom, PagedResult } from '../types';

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api').replace(/\/+$/, '');

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new Error(`เชื่อมต่อ API ที่ ${API_URL} ไม่ได้ (backend เปิดอยู่หรือไม่)`);
  }

  const body = (await response.json().catch(() => null)) as ApiResponse<T> | null;

  if (!response.ok || !body?.success) {
    throw new Error(body?.message ?? `คำขอไม่สำเร็จ (HTTP ${response.status})`);
  }

  return body.data;
}

export async function fetchAllDraws() {
  const pageSize = 100;
  const first = await request<PagedResult<CommonRandom>>(`/common-random?page=1&pageSize=${pageSize}`);
  const items = [...first.items];
  const pages = Math.ceil(first.total / pageSize);

  for (let page = 2; page <= pages; page += 1) {
    const next = await request<PagedResult<CommonRandom>>(`/common-random?page=${page}&pageSize=${pageSize}`);
    items.push(...next.items);
  }

  return items;
}

export function deleteAllDraws() {
  return request<{ deleted: number }>('/common-random', { method: 'DELETE' });
}

export function createDraw(payload: CreateDrawPayload) {
  return request<CommonRandom>('/common-random', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
