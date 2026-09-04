export interface AuthenticatedUser {
  id: string;
  email: string;
  role: 'ADMIN' | 'ACCOUNTING' | 'DISPATCHER' | 'DRIVER' | 'SAFETY';
}

export interface Session {
  accessToken: string;
  user: AuthenticatedUser;
}

export interface Load {
  id: string;
  brokerLoadNumber: string | null;
  brokerName?: string | null;
  rate?: string | null;
  commodity?: string | null;
  equipmentType?: string | null;
  specialInstructions?: string | null;
  internalLoadId: string | null;
  status: 'DRAFT' | 'CONFIRMED';
  createdAt: string;
}

export interface Stop {
  id: string;
  type: 'PICKUP' | 'DELIVERY';
  facilityName: string | null;
  city: string | null;
  state: string | null;
  appointmentAt: string | null;
}

export interface LoadDetails extends Load {
  stops: Stop[];
}

export interface LoadDocument {
  id: string;
  version: number;
  isCurrent: boolean;
  filename: string;
  createdAt: string;
}

export interface ExtractedText {
  value: string | null;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'NOT_FOUND';
}

export interface DocumentExtraction {
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  result: {
    brokerName: ExtractedText;
    brokerLoadNumber: ExtractedText;
    rate: ExtractedText;
    commodity: ExtractedText;
    equipmentType: ExtractedText;
    specialInstructions: ExtractedText;
    stops: Array<{
      type: 'PICKUP' | 'DELIVERY';
      facilityName: ExtractedText;
      address: ExtractedText;
    }>;
  } | null;
  error: string | null;
}

interface ApiFailure {
  message?: string;
  code?: string;
}

const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3100';

const request = async <T>(
  path: string,
  options: RequestInit = {},
  accessToken?: string,
): Promise<T> => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      ...(accessToken === undefined ? {} : { Authorization: `Bearer ${accessToken}` }),
    },
  });
  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as ApiFailure;
    throw new Error(error.code ?? error.message ?? `Request failed with ${response.status}.`);
  }
  return response.json() as Promise<T>;
};

export const api = {
  login: (email: string, password: string): Promise<Session> =>
    request('/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }),
  getLoads: (accessToken: string): Promise<Load[]> => request('/loads', {}, accessToken),
  getLoad: (accessToken: string, loadId: string): Promise<LoadDetails> =>
    request(`/loads/${loadId}`, {}, accessToken),
  getDocuments: (accessToken: string, loadId: string): Promise<LoadDocument[]> =>
    request(`/loads/${loadId}/documents`, {}, accessToken),
  getExtraction: (
    accessToken: string,
    loadId: string,
    documentId: string,
  ): Promise<DocumentExtraction> =>
    request(`/loads/${loadId}/documents/${documentId}/extraction`, {}, accessToken),
  applyExtractedStops: (accessToken: string, loadId: string, documentId: string): Promise<Stop[]> =>
    request(
      `/loads/${loadId}/documents/${documentId}/extraction/apply-stops`,
      { method: 'POST' },
      accessToken,
    ),
  updateLoad: (
    accessToken: string,
    loadId: string,
    input: Pick<Load, 'brokerLoadNumber' | 'rate' | 'specialInstructions'>,
  ): Promise<Load> =>
    request(
      `/loads/${loadId}`,
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      },
      accessToken,
    ),
  confirmLoad: (accessToken: string, loadId: string): Promise<Load> =>
    request(`/loads/${loadId}/confirm`, { method: 'POST' }, accessToken),
  uploadRateConfirmation: (
    accessToken: string,
    file: File,
    brokerLoadNumber: string,
  ): Promise<{ load: Load }> => {
    const body = new FormData();
    body.set('file', file);
    if (brokerLoadNumber.trim().length > 0) body.set('brokerLoadNumber', brokerLoadNumber.trim());
    return request('/loads/rate-confirmations', { method: 'POST', body }, accessToken);
  },
};
