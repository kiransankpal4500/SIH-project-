import { APP_CONFIG } from '../config/appConfig';
import { safeFetchJson } from '../utils/safeFetch';

export interface SelectedPointBathymetry {
  latitude: number;
  longitude: number;
  elevation: number;
  depth: number;
  is_ocean: boolean;
}

export interface BathymetryChunkResponse {
  selected_point: SelectedPointBathymetry;
  bounds: {
    min_latitude: number;
    max_latitude: number;
    min_longitude: number;
    max_longitude: number;
  };
  chunk_size_degrees: number;
  grid_resolution: number;
  latitudes: number[];
  longitudes: number[];
  elevations: number[][];
  depths: number[][];
  statistics: {
    min_depth_m: number;
    max_depth_m: number;
    mean_depth_m: number;
    ocean_coverage_percent: number;
  };
  label: string;
  source: string;
  dataset: string;
  dataset_version: string;
}

export interface BathymetryPointResponse {
  latitude: number;
  longitude: number;
  elevation: number;
  depth: number;
  is_ocean: boolean;
  label: string;
  source: string;
  dataset: string;
  dataset_version: string;
}

export interface CopernicusPointResponse {
  latitude: number;
  longitude: number;
  depth: number;
  time: string;
  variable: string;
  value: number | null;
  unit: string;
  label: string;
  source: string;
  dataset_id: string;
  product_id: string;
}

export interface CopernicusCurrentResponse {
  latitude: number;
  longitude: number;
  depth: number;
  time: string;
  ugo: number;
  vgo: number;
  speed: number;
  direction_degrees: number;
  unit: string;
  source: string;
  dataset_id: string;
  product_id: string;
}

export interface CopernicusProfileResponse {
  latitude: number;
  longitude: number;
  time: string;
  depths: number[];
  temperature: (number | null)[];
  salinity: (number | null)[];
  temperature_unit: string;
  salinity_unit: string;
  source: string;
  dataset_id: string;
  product_id: string;
}

export interface CopernicusMetadataResponse {
  product_id: string;
  datasets: {
    nrt: string;
    multi_year: string;
  };
  source: string;
  variables: Array<{
    key: string;
    cmems_var: string;
    unit: string;
    label: string;
  }>;
  depth_levels_m: number[];
  default_chunk_size_degrees: number;
  supported_chunk_sizes: number[];
}

const getBaseUrl = () => APP_CONFIG.api.baseUrl;

export const oceanChunkService = {
  /**
   * Fetch GEBCO bathymetric depth at a single point
   */
  /**
   * Fetch GEBCO bathymetric depth at a single point
   */
  async getBathymetryPoint(lat: number, lon: number, signal?: AbortSignal): Promise<BathymetryPointResponse> {
    return safeFetchJson<BathymetryPointResponse>(
      `${getBaseUrl()}/bathymetry/point?latitude=${lat}&longitude=${lon}`,
      { signal }
    );
  },

  /**
   * Fetch GEBCO bathymetric 2D chunk mesh for 3D terrain reconstruction
   */
  async getBathymetryChunk(
    lat: number,
    lon: number,
    chunkSize: number = 0.05,
    resolution: number = 7,
    signal?: AbortSignal
  ): Promise<BathymetryChunkResponse> {
    return safeFetchJson<BathymetryChunkResponse>(
      `${getBaseUrl()}/bathymetry/chunk?latitude=${lat}&longitude=${lon}&chunk_size=${chunkSize}&resolution=${resolution}`,
      { signal }
    );
  },

  /**
   * Fetch Copernicus Marine point variable
   */
  async getCopernicusPoint(
    lat: number,
    lon: number,
    depth: number = 0,
    variable: string = 'temperature',
    time?: string,
    signal?: AbortSignal
  ): Promise<CopernicusPointResponse> {
    let url = `${getBaseUrl()}/models/copernicus/point?latitude=${lat}&longitude=${lon}&depth=${depth}&variable=${variable}`;
    if (time) url += `&time=${encodeURIComponent(time)}`;
    return safeFetchJson<CopernicusPointResponse>(url, { signal });
  },

  /**
   * Fetch Copernicus Marine eastward/northward current velocities and speed
   */
  async getCopernicusCurrent(
    lat: number,
    lon: number,
    depth: number = 0,
    time?: string,
    signal?: AbortSignal
  ): Promise<CopernicusCurrentResponse> {
    let url = `${getBaseUrl()}/models/copernicus/current?latitude=${lat}&longitude=${lon}&depth=${depth}`;
    if (time) url += `&time=${encodeURIComponent(time)}`;
    return safeFetchJson<CopernicusCurrentResponse>(url, { signal });
  },

  /**
   * Fetch Copernicus Marine CTD depth profile soundings
   */
  async getCopernicusProfile(
    lat: number,
    lon: number,
    time?: string,
    signal?: AbortSignal
  ): Promise<CopernicusProfileResponse> {
    let url = `${getBaseUrl()}/models/copernicus/profile?latitude=${lat}&longitude=${lon}`;
    if (time) url += `&time=${encodeURIComponent(time)}`;
    return safeFetchJson<CopernicusProfileResponse>(url, { signal });
  },

  /**
   * Fetch Copernicus Marine dataset metadata
   */
  async getCopernicusMetadata(signal?: AbortSignal): Promise<CopernicusMetadataResponse> {
    return safeFetchJson<CopernicusMetadataResponse>(
      `${getBaseUrl()}/models/copernicus/metadata`,
      { signal }
    );
  },

  /**
   * Fetch INCOIS HYCOM point variable
   */
  async getHycomPoint(
    lat: number,
    lon: number,
    depth: number = 0,
    variable: string = 'temperature',
    time?: string,
    signal?: AbortSignal
  ): Promise<CopernicusPointResponse> {
    let url = `${getBaseUrl()}/models/hycom/point?latitude=${lat}&longitude=${lon}&depth=${depth}&variable=${variable}`;
    if (time) url += `&time=${encodeURIComponent(time)}`;
    const data = await safeFetchJson<any>(url, { signal });
    if (!data) throw new Error('HYCOM point data unavailable');
    return {
      latitude: data.latitude,
      longitude: data.longitude,
      depth: data.depth,
      time: data.time || data.model_time,
      variable: data.variable,
      value: data.value,
      unit: data.unit,
      label: `${data.variable?.toUpperCase() || 'DATA'} (INCOIS HYCOM)`,
      source: 'INCOIS RSMC HYCOM',
      dataset_id: data.selected_file || data.dataset || 'INCOIS_RSMC_HYCOM',
      product_id: data.model || 'HYCOM',
    };
  },

  /**
   * Fetch INCOIS HYCOM eastward/northward current velocities and speed
   */
  async getHycomCurrent(
    lat: number,
    lon: number,
    depth: number = 0,
    time?: string,
    signal?: AbortSignal
  ): Promise<CopernicusCurrentResponse> {
    let url = `${getBaseUrl()}/models/hycom/current?latitude=${lat}&longitude=${lon}&depth=${depth}`;
    if (time) url += `&time=${encodeURIComponent(time)}`;
    const data = await safeFetchJson<any>(url, { signal });
    if (!data) throw new Error('HYCOM current data unavailable');
    return {
      latitude: data.latitude,
      longitude: data.longitude,
      depth: data.depth,
      time: data.time || data.model_time,
      ugo: data.u,
      vgo: data.v,
      speed: data.speed,
      direction_degrees: data.direction,
      unit: data.unit || 'm/s',
      source: 'INCOIS RSMC HYCOM',
      dataset_id: data.selected_file || data.dataset || 'INCOIS_RSMC_HYCOM',
      product_id: data.model || 'HYCOM',
    };
  },

  /**
   * Fetch INCOIS HYCOM CTD depth profile soundings
   */
  async getHycomProfile(
    lat: number,
    lon: number,
    time?: string,
    signal?: AbortSignal
  ): Promise<CopernicusProfileResponse> {
    let url = `${getBaseUrl()}/models/hycom/profile?latitude=${lat}&longitude=${lon}`;
    if (time) url += `&time=${encodeURIComponent(time)}`;
    const data = await safeFetchJson<any>(url, { signal });
    if (!data) throw new Error('HYCOM profile data unavailable');
    const depths = (data.profile || []).map((p: any) => p.depth);
    const temperature = (data.profile || []).map((p: any) => p.temperature);
    const salinity = (data.profile || []).map((p: any) => p.salinity);
    return {
      latitude: data.latitude,
      longitude: data.longitude,
      time: data.time || data.model_time,
      depths,
      temperature,
      salinity,
      temperature_unit: '°C',
      salinity_unit: 'PSU',
      source: 'INCOIS RSMC HYCOM',
      dataset_id: data.selected_file || data.dataset || 'INCOIS_RSMC_HYCOM',
      product_id: data.model || 'HYCOM',
    };
  },

  /**
   * Fetch depth-aware and location-aware marine species from OBIS occurrence records
   */
  async getMarineLifeSpecies(
    lat: number,
    lon: number,
    depth: number = 0,
    radiusKm: number = 50,
    maxSpecies: number = 8,
    signal?: AbortSignal
  ): Promise<MarineLifeResponse> {
    return safeFetchJson<MarineLifeResponse>(
      `${getBaseUrl()}/marine-life/species?latitude=${lat}&longitude=${lon}&depth=${depth}&radius_km=${radiusKm}&max_species=${maxSpecies}`,
      { signal }
    );
  },
};

export interface MarineLifeSpecies {
  scientific_name: string;
  common_name: string;
  family: string;
  class_name: string;
  minimum_depth: number;
  maximum_depth: number;
  depth_zone: string;
  swimming_speed_mps: number;
  body_length_m: number;
  color_hex: string;
  model_type: string;
  occurrence_count: number;
  source: string;
  evidence_type: string;
}

export interface MarineLifeResponse {
  selected_location: {
    latitude: number;
    longitude: number;
    selected_depth_m: number;
    search_radius_km: number;
  };
  depth_zone: string;
  species_count: number;
  species: MarineLifeSpecies[];
  scientific_note: string;
  source: string;
}
