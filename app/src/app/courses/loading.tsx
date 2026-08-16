import RouteLoadingSkeleton from "@/components/ui/RouteLoadingSkeleton";

export default function CoursesLoading() {
  return <RouteLoadingSkeleton label="Loading courses" cards={9} />;
}
