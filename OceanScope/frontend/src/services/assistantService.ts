/**
 * OceanScope AI Research Assistant Service (Frontend)
 * Communicates with FastAPI backend assistant endpoints using safeFetchJson.
 * Handles request validation, bounded history submission, and rich scientific telemetry parsing.
 */

import { APP_CONFIG } from '../config/appConfig';
import { safeFetchJson } from '../utils/safeFetch';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  dataContext?: Record<string, any>;
  sources?: string[];
  timestamps?: Record<string, string>;
  limitations?: string[];
  requestId?: string;
  modelUsed?: string;
  isError?: boolean;
}

export interface AssistantChatRequest {
  question: string;
  latitude?: number;
  longitude?: number;
  depth?: number;
  conversation_history?: { role: 'user' | 'assistant'; content: string }[];
}

export interface AssistantMetadata {
  source: string;
  timestamp: string;
  model: string;
  has_location_context: boolean;
  selected_coordinates?: {
    latitude: number;
    longitude: number;
    depth_meters: number;
  };
  gemini_active: boolean;
}

export interface AssistantChatResponse {
  answer: string;
  data_context: Record<string, any>;
  sources: string[];
  timestamps: Record<string, string>;
  limitations: string[];
  request_id: string;
  metadata: AssistantMetadata;
  notices: string[];
}

export interface AssistantStatusResponse {
  status: string;
  module: string;
  phase: string;
  capabilities: string[];
  model_configured: string;
  gemini_active: boolean;
  gemini_setup_needed: boolean;
}

export interface LocationTarget {
  latitude: number;
  longitude: number;
  depth?: number;
  label?: string;
}

export interface CompareLocationsRequest {
  location_a: LocationTarget;
  location_b: LocationTarget;
  question?: string;
}

export interface CompareLocationsResponse {
  location_a: Record<string, any>;
  location_b: Record<string, any>;
  comparison_metrics: Record<string, any>;
  analysis: string;
  sources: string[];
  timestamps: Record<string, string>;
  limitations: string[];
  request_id: string;
  metadata: AssistantMetadata;
}

export interface GenerateReportRequest {
  question: string;
  latitude: number;
  longitude: number;
  depth?: number;
  include_depth_profile?: boolean;
}

export interface ResearchReportResponse {
  report_id: string;
  title: string;
  executive_summary: string;
  investigation_scope: {
    target_latitude: number;
    target_longitude: number;
    target_depth_m: number;
    generated_at: string;
    [key: string]: any;
  };
  methods_and_datasets: Array<{
    parameter: string;
    provider: string;
    dataset: string;
    method?: string;
    units?: string;
    depth_level?: string;
    timestamp?: string;
    status?: string;
    [key: string]: any;
  }>;
  verified_measurements: Record<string, any>;
  depth_profile_levels?: Array<{
    depth_m: number;
    temperature_c?: number | null;
    salinity_psu?: number | null;
    current_speed_m_s?: number | null;
  }>;
  scientific_interpretation: string;
  uncertainties_and_limitations: string[];
  provenance: {
    sources: string[];
    timestamps: Record<string, string>;
    model_generated: boolean;
    model_name: string;
    [key: string]: any;
  };
  generated_at: string;
}

export interface DepthProfileLevel {
  depth_m: number;
  temperature_c?: number | null;
  salinity_psu?: number | null;
  current_speed_m_s?: number | null;
}

export interface DepthProfileResponse {
  latitude: number;
  longitude: number;
  source: string;
  dataset: string;
  model_time: string;
  levels: DepthProfileLevel[];
  total_levels: number;
  has_valid_data?: boolean;
  notice?: string;
  error?: string;
}

export const assistantService = {
  /**
   * Submit an inquiry to the OceanScope AI Assistant
   */
  async sendMessage(request: AssistantChatRequest): Promise<AssistantChatResponse> {
    const trimmedQuestion = request.question.trim();
    if (!trimmedQuestion) {
      throw new Error('Question cannot be empty');
    }

    const payload = {
      question: trimmedQuestion,
      latitude: request.latitude != null ? Number(request.latitude) : undefined,
      longitude: request.longitude != null ? Number(request.longitude) : undefined,
      depth: request.depth != null ? Math.max(0, Number(request.depth)) : undefined,
      conversation_history: (request.conversation_history || []).slice(-10), // Bounded recent turns
    };

    const url = `${APP_CONFIG.api.baseUrl}/assistant/chat`;
    return safeFetchJson<AssistantChatResponse>(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
      25000 // 25s timeout
    );
  },

  /**
   * Compare two oceanographic locations side-by-side
   */
  async compareLocations(request: CompareLocationsRequest): Promise<CompareLocationsResponse> {
    const url = `${APP_CONFIG.api.baseUrl}/assistant/compare`;
    return safeFetchJson<CompareLocationsResponse>(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      },
      30000 // 30s timeout
    );
  },

  /**
   * Generate a structured scientific research report
   */
  async generateReport(request: GenerateReportRequest): Promise<ResearchReportResponse> {
    const trimmedQuestion = request.question.trim();
    if (!trimmedQuestion) {
      throw new Error('Research question cannot be empty');
    }

    const url = `${APP_CONFIG.api.baseUrl}/assistant/report`;
    return safeFetchJson<ResearchReportResponse>(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: trimmedQuestion,
          latitude: Number(request.latitude),
          longitude: Number(request.longitude),
          depth: request.depth != null ? Math.max(0, Number(request.depth)) : 0.0,
          include_depth_profile: request.include_depth_profile ?? true,
        }),
      },
      35000 // 35s timeout
    );
  },

  /**
   * Retrieve multi-depth vertical sounding profile for a coordinate
   */
  async getDepthProfile(latitude: number, longitude: number): Promise<DepthProfileResponse> {
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      lat: String(latitude),
      lon: String(longitude),
    });
    const url = `${APP_CONFIG.api.baseUrl}/assistant/depth-profile?${params.toString()}`;
    return safeFetchJson<DepthProfileResponse>(url, { method: 'GET' }, 15000);
  },

  /**
   * Check assistant service health and capabilities
   */
  async getStatus(): Promise<AssistantStatusResponse> {
    const url = `${APP_CONFIG.api.baseUrl}/assistant/status`;
    return safeFetchJson<AssistantStatusResponse>(url, { method: 'GET' }, 6000);
  },
};

