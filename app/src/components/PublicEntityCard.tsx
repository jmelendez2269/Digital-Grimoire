import { Link2 } from "lucide-react";

import { ParallaxConcept, CorrespondenceEntity, GraphType } from "@/lib/types";

// Removed local interfaces

type Entity = CorrespondenceEntity | ParallaxConcept;
// Removed local GraphType definition

interface PublicEntityCardProps {
    entity: Entity;
    graphType: GraphType;
    relationships: any[];
    onSelect: () => void;
}

export default function PublicEntityCard({
    entity,
    graphType,
    relationships,
    onSelect,
}: PublicEntityCardProps) {
    const relatedCount = relationships.filter(
        (r) => r.source_id === entity.id || r.target_id === entity.id
    ).length;

    return (
        <div
            className="bg-zinc-900/50 border border-amber-900/20 rounded-xl p-5 hover:border-amber-700/50 hover:bg-zinc-800/40 transition-all duration-300 cursor-pointer group relative shadow-lg hover:shadow-amber-950/20 active:scale-[0.98]"
            onClick={onSelect}
        >
            {/* Ambient hover glow */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl bg-[radial-gradient(circle_at_center,_var(--color-amber-500)_0%,_transparent_70%)] opacity-5 pointer-events-none" />

            {/* Content */}
            <div className="relative z-10">
                <h3 className="font-semibold text-amber-100/90 group-hover:text-white mb-2 transition-colors duration-300">
                    {entity.name}
                </h3>

                {graphType === "correspondences" ? (
                    <div className="space-y-3">
                        <span className="inline-block px-2.5 py-1 bg-amber-950/30 border border-amber-900/40 rounded-lg text-[10px] uppercase tracking-wider font-medium text-amber-200/70 group-hover:text-amber-200 group-hover:border-amber-700/50 transition-all">
                            {(entity as CorrespondenceEntity).type?.icon
                                ? `${(entity as CorrespondenceEntity).type?.icon} `
                                : ""}
                            {(entity as CorrespondenceEntity).type?.label || (entity as CorrespondenceEntity).category}
                        </span>
                        {(entity as CorrespondenceEntity).description && (
                            <p className="text-sm text-amber-100/50 line-clamp-2 group-hover:text-amber-100/70 transition-colors">
                                {(entity as CorrespondenceEntity).description}
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3">
                        <span className="inline-block px-2.5 py-1 bg-amber-950/30 border border-amber-900/40 rounded-lg text-[10px] uppercase tracking-wider font-medium text-amber-200/70 group-hover:text-amber-200 group-hover:border-amber-700/50 transition-all">
                            {(entity as ParallaxConcept).tradition_ref?.icon
                                ? `${(entity as ParallaxConcept).tradition_ref?.icon} `
                                : ""}
                            {(entity as ParallaxConcept).tradition_ref?.label || (entity as ParallaxConcept).tradition}
                        </span>
                        {(entity as ParallaxConcept).short_definition && (
                            <p className="text-sm text-amber-100/50 line-clamp-2 group-hover:text-amber-100/70 transition-colors">
                                {(entity as ParallaxConcept).short_definition}
                            </p>
                        )}
                    </div>
                )}

                {/* Connections */}
                <div className="mt-4 flex items-center gap-2 text-xs text-amber-100/40 group-hover:text-amber-100/60 transition-colors">
                    <Link2 className="w-3.5 h-3.5" />
                    <span className="font-medium">{relatedCount} resonance{relatedCount !== 1 ? "s" : ""}</span>
                </div>
            </div>
        </div>
    );
}
