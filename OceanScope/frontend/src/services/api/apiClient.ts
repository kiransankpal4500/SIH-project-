import { APP_CONFIG } from '../../config/appConfig';
import { safeFetchJson } from '../../utils/safeFetch';

/**
 * Base HTTP client for REST & WebSocket backend integration
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

    return safeFetchJson<T>(`${this.baseUrl}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}

export const apiClient = new ApiClient();
