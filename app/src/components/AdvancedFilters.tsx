'use client';

import { useState, useEffect, useMemo, memo } from 'react';
import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import { formatLensName, LENS_DESCRIPTIONS } from '@/lib/utils/formatting';
import { getLensColorClasses } from '@/lib/utils/lens-colors';

interface FilterOptions {
  domains: string[];
  types: string[];
  allTags: string[];
  allLenses: string[];
}

interface FilterValues {
  domain: string;
  type: string;
  yearMin: number | null;
  yearMax: number | null;
  tags: string[];
  lenses: string[];
}

interface AdvancedFiltersProps {
  options: FilterOptions;
  values: FilterValues;
  onChange: (values: FilterValues) => void;
}

function AdvancedFilters({ options, values, onChange }: AdvancedFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [showLensDropdown, setShowLensDropdown] = useState(false);

  const currentYear = useMemo(() => new Date().getFullYear(), []);

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

  const handleLensToggle = (lens: string) => {
    const newLenses = values.lenses.includes(lens)
      ? values.lenses.filter((l) => l !== lens)
      : [...values.lenses, lens];
    onChange({ ...values, lenses: newLenses });
  };

  const clearFilters = () => {
    onChange({
      domain: 'all',
      type: 'all',
      yearMin: null,
      yearMax: null,
      tags: [],
      lenses: [],
    });
  };

  const activeFilterCount = useMemo(() =>
    (values.domain !== 'all' ? 1 : 0) +
    (values.type !== 'all' ? 1 : 0) +
    (values.yearMin !== null ? 1 : 0) +
    (values.yearMax !== null ? 1 : 0) +
    values.tags.length +
    values.lenses.length,
    [values]
  );

  return (
    <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg overflow-hidden w-full sm:w-auto">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-zinc-900/70 transition-colors whitespace-nowrap"
      >
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-amber-600" />
          <span className="font-medium text-amber-100 text-sm">Filters</span>
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 bg-amber-600 text-white text-xs rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                clearFilters();
              }}
              className="text-xs text-amber-400 hover:text-amber-300 px-2 py-1 rounded hover:bg-amber-600/10 transition-colors cursor-pointer"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  clearFilters();
                }
              }}
            >
              Clear
            </div>
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-amber-100/60" />
          ) : (
            <ChevronDown className="w-4 h-4 text-amber-100/60" />
          )}
        </div>
      </button>

      {/* Filter Options */}
      {isExpanded && (
        <div className="px-4 py-4 border-t border-amber-900/20 space-y-4">
          {/* Domain Filter */}
          <div>
            <label htmlFor="domain-filter" className="block text-sm font-medium text-amber-100 mb-2">
              Domain
            </label>
            <select
              id="domain-filter"
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
            <label htmlFor="type-filter" className="block text-sm font-medium text-amber-100 mb-2">
              Document Type
            </label>
            <select
              id="type-filter"
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
                  aria-label="Min Year"
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
                  aria-label="Max Year"
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
                      aria-label={`Remove ${tag}`}
                      className="hover:bg-amber-600/20 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Lenses Filter */}
          <div>
            <label className="block text-sm font-medium text-amber-100 mb-2">
              Parallax Lenses
              <span className="ml-2 text-xs text-amber-100/60 font-normal">
                (The 7 perspectives)
              </span>
            </label>
            <div className="relative">
              <button
                onClick={() => setShowLensDropdown(!showLensDropdown)}
                className="w-full px-3 py-2 bg-zinc-800/50 border border-amber-900/20 rounded-lg text-amber-100 text-left flex items-center justify-between hover:bg-zinc-800 transition-colors"
              >
                <span className="text-amber-100/60">
                  {values.lenses.length > 0
                    ? `${values.lenses.length} lens${values.lenses.length > 1 ? 'es' : ''} selected`
                    : 'Select lenses...'}
                </span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {showLensDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowLensDropdown(false)}
                  />
                  <div className="absolute z-20 w-full mt-1 max-h-80 overflow-y-auto bg-zinc-800 border border-amber-900/20 rounded-lg shadow-xl">
                    {options.allLenses.length > 0 ? (
                      options.allLenses.map((lens) => {
                        const lensDisplay = formatLensName(lens);
                        const lensDescription = LENS_DESCRIPTIONS[lens];
                        const lensColor = getLensColorClasses(lens);

                        return (
                          <label
                            key={lens}
                            className={`flex items-start gap-3 px-3 py-3 ${lensColor.hoverBg} cursor-pointer transition-colors border-b border-amber-900/10 last:border-0`}
                          >
                            <input
                              type="checkbox"
                              checked={values.lenses.includes(lens)}
                              onChange={() => handleLensToggle(lens)}
                              className={`w-4 h-4 mt-0.5 rounded border-amber-900/20 bg-zinc-700 ${lensColor.accent} ${lensColor.ring} focus:ring-offset-0`}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 text-sm font-medium text-amber-100">
                                <span className={`h-2 w-2 rounded-full ${lensColor.dot}`} />
                                <span>{lensDisplay}</span>
                              </div>
                              <div className="text-xs text-amber-100/50 mt-0.5">{lensDescription}</div>
                            </div>
                          </label>
                        );
                      })
                    ) : (
                      <div className="px-3 py-4 text-sm text-amber-100/60 text-center">
                        No lenses available
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Selected Lenses */}
            {values.lenses.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {values.lenses.map((lens) => {
                  const lensColor = getLensColorClasses(lens);

                  return (
                  <span
                    key={lens}
                    className={`inline-flex items-center gap-1 px-2 py-1 ${lensColor.bg} ${lensColor.text} rounded-full text-xs font-medium border ${lensColor.border}`}
                  >
                    {formatLensName(lens)}
                    <button
                      onClick={() => handleLensToggle(lens)}
                      aria-label={`Remove ${formatLensName(lens)}`}
                      className={`${lensColor.hoverBg} rounded-full p-0.5 transition-colors`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(AdvancedFilters);
