'use client';

import { useState } from 'react';
import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react';

export interface MediaFilterValues {
  mediaType: 'all' | 'audio' | 'video' | 'photo';
  domain: string;
  durationMin?: number;
  durationMax?: number;
  yearMin?: number;
  yearMax?: number;
  tags: string[];
}

interface MediaFiltersProps {
  filterValues: MediaFilterValues;
  onFilterChange: (values: MediaFilterValues) => void;
  availableDomains: string[];
  availableTags: string[];
}

export default function MediaFilters({
  filterValues,
  onFilterChange,
  availableDomains,
  availableTags,
}: MediaFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleMediaTypeChange = (type: 'all' | 'audio' | 'video' | 'photo') => {
    onFilterChange({ ...filterValues, mediaType: type });
  };

  const handleDomainChange = (domain: string) => {
    onFilterChange({ ...filterValues, domain });
  };

  const handleTagToggle = (tag: string) => {
    const newTags = filterValues.tags.includes(tag)
      ? filterValues.tags.filter((t) => t !== tag)
      : [...filterValues.tags, tag];
    onFilterChange({ ...filterValues, tags: newTags });
  };

  const clearAllFilters = () => {
    onFilterChange({
      mediaType: 'all',
      domain: 'all',
      tags: [],
    });
  };

  const activeFilterCount =
    (filterValues.mediaType !== 'all' ? 1 : 0) +
    (filterValues.domain !== 'all' ? 1 : 0) +
    filterValues.tags.length;

  return (
    <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-amber-400" />
          <span className="text-amber-100 font-medium">Media Filters</span>
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 bg-amber-600 text-white text-xs rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-amber-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-amber-400" />
        )}
      </button>

      {isExpanded && (
        <div className="p-4 space-y-4 border-t border-amber-900/20">
          {/* Media Type Filter */}
          <div>
            <label className="block text-sm font-medium text-amber-100 mb-2">
              Media Type
            </label>
            <div className="flex flex-wrap gap-2">
              {(['all', 'audio', 'video', 'photo'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => handleMediaTypeChange(type)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filterValues.mediaType === type
                      ? 'bg-amber-600 text-white'
                      : 'bg-zinc-800/50 text-amber-100/80 hover:bg-zinc-800'
                  }`}
                >
                  {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Domain Filter */}
          <div>
            <label className="block text-sm font-medium text-amber-100 mb-2">
              Domain
            </label>
            <select
              value={filterValues.domain}
              onChange={(e) => handleDomainChange(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 border border-amber-900/30 rounded-lg text-amber-100 text-sm"
            >
              <option value="all">All Domains</option>
              {availableDomains.map((domain) => (
                <option key={domain} value={domain}>
                  {domain}
                </option>
              ))}
            </select>
          </div>

          {/* Tags Filter */}
          {availableTags.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-amber-100 mb-2">
                Tags
              </label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {availableTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleTagToggle(tag)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      filterValues.tags.includes(tag)
                        ? 'bg-amber-600 text-white'
                        : 'bg-zinc-800/50 text-amber-100/80 hover:bg-zinc-800'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Clear Filters */}
          {activeFilterCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="w-full px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-amber-900/30 rounded-lg text-sm text-amber-100 transition-colors flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              Clear All Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}

