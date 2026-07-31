import { LockKeyhole } from 'lucide-react';

import {
  COURSE_RELEASE_LABELS,
  isCourseAvailable,
  type CourseReleaseStatus,
} from '@/lib/courses/presentation';

const STATUS_STYLES: Record<CourseReleaseStatus, string> = {
  'open-now': 'border-emerald-400/35 bg-emerald-500/10 text-emerald-300',
  'coming-next': 'border-amber-400/35 bg-amber-500/10 text-amber-300',
  'coming-later': 'border-white/10 bg-white/[0.04] text-zinc-300',
};

export default function CourseReleaseBadge({
  status,
  className = '',
}: {
  status: CourseReleaseStatus;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.18em] ${STATUS_STYLES[status]} ${className}`}
    >
      {!isCourseAvailable(status) ? (
        <LockKeyhole className="h-3 w-3" aria-hidden="true" />
      ) : null}
      {COURSE_RELEASE_LABELS[status]}
    </span>
  );
}
