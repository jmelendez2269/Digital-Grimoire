"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Edit, Maximize2 } from "lucide-react";
import EntityDetailModal from "@/components/admin/EntityDetailModal";
import CorrespondenceProfileDossier from "@/components/graph/CorrespondenceProfileDossier";
import { useAuth } from "@/contexts/AuthContext";
import type { CorrespondenceProfile } from "@/lib/graph/correspondence-profile";
import { CorrespondenceEntity, ParallaxConcept } from "@/lib/types";

export default function EntityDetails({
  entity,
}: {
  entity: (ParallaxConcept | CorrespondenceEntity) & Record<string, any> | null;
}) {
  const [profile, setProfile] = useState<CorrespondenceProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [showExpandModal, setShowExpandModal] = useState(false);
  const [modalEntity, setModalEntity] = useState<CorrespondenceEntity | null>(null);
  const { isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setModalEntity(entity as CorrespondenceEntity | null);
  }, [entity]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!entity?.id) {
        setProfile(null);
        return;
      }

      try {
        setLoadingProfile(true);
        const res = await fetch(`/api/graph/entity-profile?entityId=${entity.id}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to load profile");
        }
        setProfile(data.profile || null);
      } catch (error) {
        console.error("Error loading correspondence profile:", error);
        setProfile(null);
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfile();
  }, [entity?.id]);

  if (!entity) {
    return <div className="text-sm text-amber-100/60">Select a node to view details.</div>;
  }

  const handleEdit = () => {
    router.push(`/admin/knowledge-graph?editId=${entity.id}&graphType=correspondences`);
  };

  const openEntityModal = (nextEntity: CorrespondenceEntity) => {
    setModalEntity(nextEntity);
    setShowExpandModal(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="mb-2 inline-block rounded-md border border-amber-700/40 bg-amber-900/30 px-2.5 py-1">
            <div className="text-xs font-medium uppercase tracking-wide text-amber-200">
              {entity.category || entity.tradition || "Entity"}
            </div>
          </div>
          <div className="text-2xl font-bold leading-tight text-amber-100">{entity.name}</div>
        </div>

        <div className="flex flex-shrink-0 gap-2">
          {isAdmin && (
            <button
              onClick={handleEdit}
              className="rounded-lg border border-amber-900/30 bg-zinc-800 p-2 text-amber-100/70 transition-colors hover:border-amber-700/50 hover:bg-zinc-700 hover:text-amber-100"
              title="Edit entity"
            >
              <Edit className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => openEntityModal(entity as CorrespondenceEntity)}
            className="rounded-lg border border-amber-900/30 bg-zinc-800 p-2 text-amber-100/70 transition-colors hover:border-amber-700/50 hover:bg-zinc-700 hover:text-amber-100"
            title="Expand view"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {loadingProfile ? (
        <div className="text-xs italic text-amber-100/40">Loading structured profile...</div>
      ) : profile ? (
        <CorrespondenceProfileDossier
          profile={profile}
          compact
          onSelectConnectionEntity={(connection) => {
            openEntityModal({
              id: connection.entity.id,
              slug: connection.entity.slug,
              name: connection.entity.name,
              category: connection.entity.category || null,
              type: connection.entity.typeLabel
                ? {
                    id: "",
                    slug: connection.entity.typeLabel.toLowerCase().replace(/\s+/g, "-"),
                    label: connection.entity.typeLabel,
                    color: connection.entity.color || undefined,
                    icon: connection.entity.icon || undefined,
                  }
                : undefined,
            });
          }}
        />
      ) : (
        <div className="text-sm italic text-amber-100/40">
          No structured profile is available for this entity yet.
        </div>
      )}

      {showExpandModal && modalEntity && (
        <EntityDetailModal
          entity={modalEntity}
          graphType="correspondences"
          onClose={() => setShowExpandModal(false)}
        />
      )}
    </div>
  );
}
