import React, { useState } from 'react';
import { ObservationFilter } from '../../components/observations/ObservationFilter';
import { ObservationTablePlaceholder } from '../../components/observations/ObservationTablePlaceholder';
import { useOceanData } from '../../hooks/useOceanData';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Compass } from 'lucide-react';
import { Card } from '../../components/common/Card';

export const ObservationsPage: React.FC = () => {
  const { observations, loading } = useOceanData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSource, setSelectedSource] = useState('ALL');

  const filteredObservations = observations.filter((obs) => {
    const matchesSearch =
      obs.platformId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (obs.location.regionName && obs.location.regionName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSource = selectedSource === 'ALL' || obs.source === selectedSource;
    return matchesSearch && matchesSource;
  });

  if (loading) {
    return <LoadingSpinner label="Loading in-situ ocean observation telemetry..." />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-ocean-850 pb-3">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Compass className="w-5 h-5 text-ocean-400" />
            In-Situ Ocean Observations
          </h1>
          <p className="text-xs font-mono text-slate-400">
            Argo float arrays, INCOIS moored buoys, ship CTD profiles & satellite telemetry
          </p>
        </div>
      </div>

      {/* Filter Controls */}
      <ObservationFilter
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedSource={selectedSource}
        onSourceChange={setSelectedSource}
      />

      {/* Table Shell */}
      <Card
        title={`Registered Active Platforms (${filteredObservations.length})`}
        subtitle="Live ingested spatial points ready for model cross-validation"
      >
        <ObservationTablePlaceholder observations={filteredObservations} />
      </Card>
    </div>
  );
};
