import { Edit, Trash2, Link2, Plus, Box, Zap } from "lucide-react";

interface EntityNodeProps {
    entity: any;
    graphType: "correspondences" | "parallax";
    relationships: any[];
    onSelect: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    onCreateConnection?: () => void;
}

export default function EntityNode({
    entity,
    graphType,
    relationships,
    onSelect,
    onEdit,
    onDelete,
    onCreateConnection,
}: EntityNodeProps) {
    const relatedCount = relationships.filter(
        (r) => r.source_id === entity.id || r.target_id === entity.id
    ).length;

    const isParallax = graphType === "parallax";

    // Extract display data based on type
    const typeLabel = isParallax
        ? (entity.tradition_ref?.label || entity.tradition)
        : (entity.type?.label || entity.category || "Unknown");

    const typeIcon = isParallax
        ? (entity.tradition_ref?.icon)
        : (entity.type?.icon);

    // Styling based on type
    const borderColor = isParallax ? "border-cyan-500/20" : "border-amber-500/20 hover:border-amber-500/50";
    const glowColor = isParallax ? "hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]" : "hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]";
    const iconColor = isParallax ? "text-cyan-500" : "text-amber-500";
    const badgeBg = isParallax ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-200" : "bg-amber-500/10 border-amber-500/20 text-amber-200";

    return (
        <div
            onClick={onSelect}
            className={`
        relative group overflow-hidden
        bg-black/40 backdrop-blur-sm
        border ${borderColor}
        rounded-xl
        transition-all duration-300
        ${glowColor}
        hover:-translate-y-1
      `}
        >
            {/* Scanline Overlay */}
            <div
                className="absolute inset-0 pointer-events-none opacity-[0.03] z-0"
                style={{
                    backgroundImage: "linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))",
                    backgroundSize: "100% 2px, 3px 100%"
                }}
            />

            {/* Header Bar */}
            <div className="relative z-10 flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/[0.02]">
                <div className={`flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest ${iconColor}`}>
                    {typeIcon ? (<span>{typeIcon}</span>) : (isParallax ? <Box className="w-3 h-3" /> : <Zap className="w-3 h-3" />)}
                    <span className="opacity-70">ID: {entity.id.slice(0, 8)}</span>
                </div>

                {/* Hover Actions */}
                {(onEdit || onDelete) && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {onEdit && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                                className="p-1 hover:bg-white/10 rounded text-amber-100/50 hover:text-amber-100 transition-colors"
                                title="Edit Node"
                                aria-label="Edit Node"
                            >
                                <Edit className="w-3 h-3" />
                            </button>
                        )}
                        {onDelete && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                                className="p-1 hover:bg-red-500/20 rounded text-amber-100/50 hover:text-red-400 transition-colors destroy-btn"
                                title="Delete Node"
                                aria-label="Delete Node"
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="relative z-10 p-4">
                <h3 className="text-lg font-bold text-amber-50 leading-tight mb-2 group-hover:text-amber-100 transition-colors">
                    {entity.name}
                </h3>

                <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border ${badgeBg}`}>
                        {typeLabel}
                    </span>
                </div>

                <p className="text-amber-100/40 text-xs leading-relaxed line-clamp-2 h-9">
                    {isParallax ? entity.short_definition : entity.description}
                </p>

                {/* Footer / Connections */}
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-amber-100/30">
                        <Link2 className="w-3 h-3" />
                        <span className="font-mono">{relatedCount} LINK{relatedCount !== 1 ? 'S' : ''}</span>
                    </div>


                    {onCreateConnection ? (
                        <button
                            onClick={(e) => { e.stopPropagation(); onCreateConnection(); }}
                            className="p-1.5 rounded-md bg-white/5 hover:bg-amber-500/20 text-amber-100/30 hover:text-amber-400 transition-all"
                            title="Link Node"
                        >
                            <Plus className="w-3.5 h-3.5" />
                        </button>
                    ) : (
                        <div className="w-3.5 h-3.5" /> /* Spacer */
                    )}
                </div>
            </div>
        </div>
    );
}
