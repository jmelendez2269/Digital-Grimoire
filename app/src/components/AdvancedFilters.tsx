'use client';

import { useState, useEffect } from 'react';
import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react';

interface FilterOptions {
  domains: string[];
  types: string[];
  allTags: string[];
}

interface FilterValues {
  domain: string;
  type: string;
  yearMin: number | null;
  yearMax: number | null;
  tags: string[];
}

interface AdvancedFiltersProps {
  options: FilterOptions;
  values: FilterValues;
  onChange: (values: FilterValues) => void;
}

export default function AdvancedFilters({ options, values, onChange }: AdvancedFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTagDropdown, setShowTagDropdown] = useState(false);

  const currentYear = new Date().getFullYear();

  const handleDomainChange = (domain: string) => {
    onChange({ ...values, domain });
  };

  const handleTypeChange = (type: string) => {
    onChange({ ...values, type });
  };

  const handleYearMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ? parseInt(e.target.value) : null;
    onChange({ ...values, yearMin: value });
  };

  const handleYearMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ? parseInt(e.target.value) : null;
    onChange({ ...values, yearMax: value });
  };

  const handleTagToggle = (tag: string) => {
    const newTags = values.tags.includes(tag)
      ? values.tags.filter((t) => t !== tag)
      : [...values.tags, tag];
    onChange({ ...values, tags: newTags });
  };

  const clearFilters = () => {
    onChange({
      domain: 'all',
      type: 'all',
      yearMin: null,
      yearMax: null,
      tags: [],
    });
  };

  const activeFilterCount = 
    (values.domain !== 'all' ? 1 : 0) +
    (values.type !== 'all' ? 1 : 0) +
    (values.yearMin !== null ? 1 : 0) +
    (values.yearMax !== null ? 1 : 0) +
    values.tags.length;

  return (
    <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-900/70 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-amber-600" />
          <span className="font-medium text-amber-100">Advanced Filters</span>
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 bg-amber-600 text-white text-xs rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearFilters();
              }}
              className="text-xs text-amber-400 hover:text-amber-300 px-2 py-1 rounded hover:bg-amber-600/10 transition-colors"
            >
              Clear all
            </button>
          )}
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-amber-100/60" />
          ) : (
            <ChevronDown className="w-5 h-5 text-amber-100/60" />
          )}
        </div>
      </button>

      {/* Filter Options */}
      {isExpanded && (
        <div className="px-4 py-4 border-t border-amber-900/20 space-y-4">
          {/* Domain Filter */}
          <div>
            <label className="block text-sm font-medium text-amber-100 mb-2">
              Domain
            </label>
            <select
              value={values.domain}
              onChange={(e) => handleDomainChange(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800/50 border border-amber-900/20 rounded-lg text-amber-100 focus:outline-none focus:border-amber-600/50 transition-colors"
            >
              <option value="all">All Domains</option>
              {options.domains.map((domain) => (
                <option key={domain} value={domain}>
                  {domain.charAt(0).toUpperCase() + domain.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-sm font-medium text-amber-100 mb-2">
              Document Type
            </label>
            <select
              value={values.type}
              onChange={(e) => handleTypeChange(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800/50 border border-amber-900/20 rounded-lg text-amber-100 focus:outline-none focus:border-amber-600/50 transition-colors"
            >
              <option value="all">All Types</option>
              {options.types.map((type) => (
                <option key={type} value={type}>
                  {type.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Year Range Filter */}
          <div>
            <label className="block text-sm font-medium text-amber-100 mb-2">
              Year Range
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  type="number"
                  placeholder="From"
                  min="0"
                  max={currentYear}
                  value={values.yearMin || ''}
                  onChange={handleYearMinChange}
                  className="w-full px-3 py-2 bg-zinc-800/50 border border-amber-900/20 rounded-lg text-amber-100 placeholder-amber-100/40 focus:outline-none focus:border-amber-600/50 transition-colors"
                />
              </div>
              <div>
                <input
                  type="number"
                  placeholder="To"
                  min={values.yearMin || 0}
                  max={currentYear}
                  value={values.yearMax || ''}
                  onChange={handleYearMaxChange}
                  className="w-full px-3 py-2 bg-zinc-800/50 border border-amber-900/20 rounded-lg text-amber-100 placeholder-amber-100/40 focus:outline-none focus:border-amber-600/50 transition-colors"
                />
              </div>
            </div>
            {(values.yearMin !== null || values.yearMax !== null) && (
              <div className="mt-2 text-xs text-amber-100/60">
                Showing documents from{' '}
                {values.yearMin || '∞'} to {values.yearMax || currentYear}
              </div>
            )}
          </div>

          {/* Tags Filter */}
          <div>
            <label className="block text-sm font-medium text-amber-100 mb-2">
              Tags
            </label>
            <div className="relative">
              <button
                onClick={() => setShowTagDropdown(!showTagDropdown)}
                className="w-full px-3 py-2 bg-zinc-800/50 border border-amber-900/20 rounded-lg text-amber-100 text-left flex items-center justify-between hover:bg-zinc-800 transition-colors"
              >
                <span className="text-amber-100/60">
                  {values.tags.length > 0
                    ? `${values.tags.length} tag${values.tags.length > 1 ? 's' : ''} selected`
                    : 'Select tags...'}
                </span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {showTagDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowTagDropdown(false)}
                  />
                  <div className="absolute z-20 w-full mt-1 max-h-60 overflow-y-auto bg-zinc-800 border border-amber-900/20 rounded-lg shadow-xl">
                    {options.allTags.length > 0 ? (
                      options.allTags.map((tag) => (
                        <label
                          key={tag}
                          className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-700/50 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={values.tags.includes(tag)}
                            onChange={() => handleTagToggle(tag)}
                            className="w-4 h-4 rounded border-amber-900/20 bg-zinc-700 text-amber-600 focus:ring-amber-600 focus:ring-offset-0"
                          />
                          <span className="text-sm text-amber-100">{tag}</span>
                        </label>
                      ))
                    ) : (
                      <div className="px-3 py-4 text-sm text-amber-100/60 text-center">
                        No tags available
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Selected Tags */}
            {values.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {values.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-amber-600/10 text-amber-400 rounded-full text-xs font-medium border border-amber-600/20"
                  >
                    {tag}
                    <button
                      onClick={() => handleTagToggle(tag)}
                      className="hover:bg-amber-600/20 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

