/**
 * Cloud Firestore Service for OceanScope
 * Manages persisting and fetching user points of interest, custom ocean telemetry bookmarks,
 * and disaster incident reports in Firebase Firestore.
 */

import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface OceanMarker {
  id?: string;
  name: string;
  latitude: number;
  longitude: number;
  depth?: number;
  variable?: string;
  notes?: string;
  createdAt?: string;
}

export interface DisasterIncidentRecord {
  id?: string;
  type: string;
  region: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  latitude: number;
  longitude: number;
  description: string;
  reportedAt?: string;
}

const MARKERS_COLLECTION = 'ocean_markers';
const DISASTERS_COLLECTION = 'disaster_reports';

/**
 * Save or update a bookmarked ocean marker in Firestore
 */
export async function saveOceanMarker(marker: OceanMarker): Promise<string> {
  try {
    const markerId = marker.id || `marker_${Date.now()}`;
    const markerRef = doc(db, MARKERS_COLLECTION, markerId);
    await setDoc(markerRef, {
      ...marker,
      id: markerId,
      timestamp: Timestamp.now(),
      createdAt: marker.createdAt || new Date().toISOString(),
    });
    return markerId;
  } catch (error) {
    console.warn('[Firestore] Failed to save ocean marker:', error);
    throw error;
  }
}

/**
 * Fetch all saved ocean markers from Firestore
 */
export async function getOceanMarkers(): Promise<OceanMarker[]> {
  try {
    const q = query(collection(db, MARKERS_COLLECTION), orderBy('timestamp', 'desc'), limit(50));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => d.data() as OceanMarker);
  } catch (error) {
    console.warn('[Firestore] Failed to retrieve ocean markers:', error);
    return [];
  }
}

/**
 * Save a new disaster incident report to Firestore
 */
export async function reportDisasterIncident(incident: DisasterIncidentRecord): Promise<string> {
  try {
    const incidentId = incident.id || `incident_${Date.now()}`;
    const incidentRef = doc(db, DISASTERS_COLLECTION, incidentId);
    await setDoc(incidentRef, {
      ...incident,
      id: incidentId,
      timestamp: Timestamp.now(),
      reportedAt: incident.reportedAt || new Date().toISOString(),
    });
    return incidentId;
  } catch (error) {
    console.warn('[Firestore] Failed to report disaster incident:', error);
    throw error;
  }
}

/**
 * Fetch recent disaster reports from Firestore
 */
export async function getRecentDisasterReports(): Promise<DisasterIncidentRecord[]> {
  try {
    const q = query(collection(db, DISASTERS_COLLECTION), orderBy('timestamp', 'desc'), limit(30));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => d.data() as DisasterIncidentRecord);
  } catch (error) {
    console.warn('[Firestore] Failed to retrieve disaster reports:', error);
    return [];
  }
}
