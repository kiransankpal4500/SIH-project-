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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#172033] tracking-tight flex items-center gap-2.5">
            <div className="p-2 bg-[#E0F2FE] text-[#0B84C6] rounded-lg">
              <Compass className="w-5 h-5" />
            </div>
            In-Situ Ocean Observations
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Argo float arrays, INCOIS moored buoys, ship CTD vertical profiles, and satellite sensor telemetry.
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

      {/* Table Card */}
      <Card
        title={`Registered Active Sensor Platforms (${filteredObservations.length})`}
        subtitle="Real-time ingested spatial observation points available for numerical model cross-validation"
      >
        <ObservationTablePlaceholder observations={filteredObservations} />
      </Card>
    </div>
  );
};
