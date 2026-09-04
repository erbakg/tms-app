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
  position: number;
  facilityName: string | null;
  addressLine1: string | null;
  city: string | null;
  state: string | null;
  appointmentAt: string | null;
}

export interface LoadDetails extends Load {
  stops: Stop[];
  assignedDriver: Driver | null;
  fieldVisibility: Array<{ field: DriverVisibleField; visibleToDriver: boolean }>;
}

export interface Driver {
  id: string;
  email: string;
  fullName: string;
  role: 'DRIVER';
}

export const driverVisibleFields = [
  'brokerLoadNumber',
  'brokerName',
  'commodity',
  'weight',
  'pieces',
  'equipmentType',
  'temperatureRequirements',
  'specialInstructions',
  'trackingRequirements',
  'podRequirements',
  'requiredDocuments',
] as const;

export type DriverVisibleField = (typeof driverVisibleFields)[number];

export interface LoadDocument {
  id: string;
  version: number;
  isCurrent: boolean;
  filename: string;
  mimeType: string;
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
  if (response.status === 204) return undefined as T;
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
  getDrivers: (accessToken: string): Promise<Driver[]> =>
    request('/users?role=DRIVER', {}, accessToken),
  getLoad: (accessToken: string, loadId: string): Promise<LoadDetails> =>
    request(`/loads/${loadId}`, {}, accessToken),
  getDocuments: (accessToken: string, loadId: string): Promise<LoadDocument[]> =>
    request(`/loads/${loadId}/documents`, {}, accessToken),
  getDocumentDownloadUrl: (
    accessToken: string,
    loadId: string,
    documentId: string,
  ): Promise<{ url: string }> =>
    request(`/loads/${loadId}/documents/${documentId}/download`, {}, accessToken),
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
    input: Pick<
      Load,
      'brokerLoadNumber' | 'brokerName' | 'rate' | 'equipmentType' | 'specialInstructions'
    >,
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
  assignDriver: (accessToken: string, loadId: string, driverId: string): Promise<Load> =>
    request(
      `/loads/${loadId}/assign-driver`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ driverId }),
      },
      accessToken,
    ),
  setDriverFieldVisibility: (
    accessToken: string,
    loadId: string,
    field: DriverVisibleField,
    visibleToDriver: boolean,
  ): Promise<void> =>
    request(
      `/loads/${loadId}/field-visibility`,
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ field, visibleToDriver }),
      },
      accessToken,
    ),
  createStop: (
    accessToken: string,
    loadId: string,
    input: {
      type: Stop['type'];
      facilityName?: string;
      addressLine1?: string;
      city?: string;
      state?: string;
    },
  ): Promise<Stop> =>
    request(
      `/loads/${loadId}/stops`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      },
      accessToken,
    ),
  updateStop: (
    accessToken: string,
    loadId: string,
    stopId: string,
    input: {
      type?: Stop['type'];
      facilityName?: string;
      addressLine1?: string;
      city?: string;
      state?: string;
    },
  ): Promise<Stop> =>
    request(
      `/loads/${loadId}/stops/${stopId}`,
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      },
      accessToken,
    ),
  deleteStop: (accessToken: string, loadId: string, stopId: string): Promise<void> =>
    request(`/loads/${loadId}/stops/${stopId}`, { method: 'DELETE' }, accessToken),
  reorderStops: (accessToken: string, loadId: string, stopIds: string[]): Promise<Stop[]> =>
    request(
      `/loads/${loadId}/stops/reorder`,
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ stopIds }),
      },
      accessToken,
    ),
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
