import { Link2 } from "lucide-react";

interface CorrespondenceEntity {
    id: string;
    slug: string;
    name: string;
    category: string;
    type_id?: string;
    type?: { id: string; slug: string; label: string; color?: string; icon?: string };
    aliases?: string[];
    description?: string;
    lenses?: string[];
}

interface ParallaxConcept {
    id: string;
    slug: string;
    name: string;
    tradition: string;
    tradition_id?: string;
    tradition_ref?: { id: string; slug: string; label: string; color?: string; icon?: string };
    era?: string;
    short_definition?: string;
    primary_sources?: string[];
    tags?: string[];
}

type Entity = CorrespondenceEntity | ParallaxConcept;
type GraphType = "correspondences" | "parallax";

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
            className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-4 hover:border-amber-700/50 transition-colors cursor-pointer group relative"
            onClick={onSelect}
        >
            {/* Content */}
            <div>
                <h3 className="font-semibold text-amber-100 mb-2">{entity.name}</h3>

                {graphType === "correspondences" ? (
                    <div className="space-y-2">
                        <span className="inline-block px-2 py-0.5 bg-amber-900/20 border border-amber-700/30 rounded text-xs text-amber-100/80">
                            {(entity as CorrespondenceEntity).type?.icon
                                ? `${(entity as CorrespondenceEntity).type?.icon} `
                                : ""}
                            {(entity as CorrespondenceEntity).type?.label || (entity as CorrespondenceEntity).category}
                        </span>
                        {(entity as CorrespondenceEntity).description && (
                            <p className="text-sm text-amber-100/60 line-clamp-2">
                                {(entity as CorrespondenceEntity).description}
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="space-y-2">
                        <span className="inline-block px-2 py-0.5 bg-amber-900/20 border border-amber-700/30 rounded text-xs text-amber-100/80">
                            {(entity as ParallaxConcept).tradition_ref?.icon
                                ? `${(entity as ParallaxConcept).tradition_ref?.icon} `
                                : ""}
                            {(entity as ParallaxConcept).tradition_ref?.label || (entity as ParallaxConcept).tradition}
                        </span>
                        {(entity as ParallaxConcept).short_definition && (
                            <p className="text-sm text-amber-100/60 line-clamp-2">
                                {(entity as ParallaxConcept).short_definition}
                            </p>
                        )}
                    </div>
                )}

                {/* Connections */}
                <div className="mt-3 flex items-center gap-2 text-xs text-amber-100/50">
                    <Link2 className="w-3.5 h-3.5" />
                    <span>{relatedCount} connection{relatedCount !== 1 ? "s" : ""}</span>
                </div>
            </div>
        </div>
    );
}
