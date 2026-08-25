export function resolveCourseImportPublicationState({
  existingPublished,
  publishImmediately,
}: {
  existingPublished?: boolean;
  publishImmediately: boolean;
}): boolean {
  return existingPublished ?? publishImmediately;
}
