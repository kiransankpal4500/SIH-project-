import { APP_CONFIG } from '../config/appConfig';

/**
 * Base HTTP client shell for future REST & WebSocket backend integration
 */
export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = APP_CONFIG.api.baseUrl) {
    this.baseUrl = baseUrl;
  }

  async get<T>(endpoint: string): Promise<T> {
    if (APP_CONFIG.api.enableMockData) {
      throw new Error(`Mock mode active: Direct fetch skipped for ${endpoint}`);
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API Error ${response.status}: ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }
}

export const apiClient = new ApiClient();
