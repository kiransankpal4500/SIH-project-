import { APP_CONFIG } from '../config/appConfig';

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

const BASE_URL = APP_CONFIG.api.baseUrl;

export const oceanChunkService = {
  /**
   * Fetch GEBCO bathymetric depth at a single point
   */
  async getBathymetryPoint(lat: number, lon: number): Promise<BathymetryPointResponse> {
    const res = await fetch(`${BASE_URL}/bathymetry/point?latitude=${lat}&longitude=${lon}`);
    if (!res.ok) {
      throw new Error(`Bathymetry unavailable (HTTP ${res.status})`);
    }
    return res.json();
  },

  /**
   * Fetch GEBCO bathymetric 2D chunk mesh for 3D terrain reconstruction
   */
  async getBathymetryChunk(
    lat: number,
    lon: number,
    chunkSize: number = 0.05,
    resolution: number = 7
  ): Promise<BathymetryChunkResponse> {
    const res = await fetch(
      `${BASE_URL}/bathymetry/chunk?latitude=${lat}&longitude=${lon}&chunk_size=${chunkSize}&resolution=${resolution}`
    );
    if (!res.ok) {
      throw new Error(`Bathymetry unavailable (HTTP ${res.status})`);
    }
    return res.json();
  },

  /**
   * Fetch Copernicus Marine point variable
   */
  async getCopernicusPoint(
    lat: number,
    lon: number,
    depth: number = 0,
    variable: string = 'temperature',
    time?: string
  ): Promise<CopernicusPointResponse> {
    let url = `${BASE_URL}/models/copernicus/point?latitude=${lat}&longitude=${lon}&depth=${depth}&variable=${variable}`;
    if (time) url += `&time=${encodeURIComponent(time)}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Copernicus ocean data unavailable (HTTP ${res.status})`);
    }
    return res.json();
  },

  /**
   * Fetch Copernicus Marine eastward/northward current velocities and speed
   */
  async getCopernicusCurrent(
    lat: number,
    lon: number,
    depth: number = 0,
    time?: string
  ): Promise<CopernicusCurrentResponse> {
    let url = `${BASE_URL}/models/copernicus/current?latitude=${lat}&longitude=${lon}&depth=${depth}`;
    if (time) url += `&time=${encodeURIComponent(time)}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Copernicus ocean data unavailable (HTTP ${res.status})`);
    }
    return res.json();
  },

  /**
   * Fetch Copernicus Marine CTD depth profile soundings
   */
  async getCopernicusProfile(
    lat: number,
    lon: number,
    time?: string
  ): Promise<CopernicusProfileResponse> {
    let url = `${BASE_URL}/models/copernicus/profile?latitude=${lat}&longitude=${lon}`;
    if (time) url += `&time=${encodeURIComponent(time)}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Copernicus ocean data unavailable (HTTP ${res.status})`);
    }
    return res.json();
  },

  /**
   * Fetch Copernicus Marine dataset metadata
   */
  async getCopernicusMetadata(): Promise<CopernicusMetadataResponse> {
    const res = await fetch(`${BASE_URL}/models/copernicus/metadata`);
    if (!res.ok) {
      throw new Error(`Copernicus ocean data unavailable (HTTP ${res.status})`);
    }
    return res.json();
  },

  /**
   * Fetch depth-aware and location-aware marine species from OBIS occurrence records
   */
  async getMarineLifeSpecies(
    lat: number,
    lon: number,
    depth: number = 0,
    radiusKm: number = 50,
    maxSpecies: number = 8
  ): Promise<MarineLifeResponse> {
    const res = await fetch(
      `${BASE_URL}/marine-life/species?latitude=${lat}&longitude=${lon}&depth=${depth}&radius_km=${radiusKm}&max_species=${maxSpecies}`
    );
    if (!res.ok) {
      throw new Error(`Marine life data unavailable (HTTP ${res.status})`);
    }
    return res.json();
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
