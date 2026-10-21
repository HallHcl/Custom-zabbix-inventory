import React from "react";
import { useTwinStore } from "../../store/useTwinStore";
import { NOCPersonaView } from "./NOCPersonaView";
import { SupervisorPersonaView } from "./SupervisorPersonaView";
import { ManagerPersonaView } from "./ManagerPersonaView";
import type { RoomOverview, RackSummary } from "../../types";

interface PersonaViewContainerProps {
  overview: RoomOverview | null;
  onSelectRack: (rack: RackSummary) => void;
  onViewRackElevation: (rack: RackSummary) => void;
  onNavigateToAlerts: () => void;
  onOpenUnassigned?: () => void;
  unassignedCount?: number;
  onMountDevice?: (rackId: number) => void;
}

export const PersonaViewContainer: React.FC<PersonaViewContainerProps> = ({
  overview,
  onSelectRack,
  onViewRackElevation,
  onNavigateToAlerts,
  onOpenUnassigned,
  unassignedCount = 0,
  onMountDevice,
}) => {
  const persona = useTwinStore((state) => state.persona);

  return (
    <div className="w-full h-full animate-in fade-in duration-200">
      {persona === "NOC" && (
        <NOCPersonaView
          overview={overview}
          onSelectRack={onSelectRack}
          onViewRackElevation={onViewRackElevation}
          onNavigateToAlerts={onNavigateToAlerts}
        />
      )}

      {persona === "Supervisor" && (
        <SupervisorPersonaView
          overview={overview}
          onViewRackElevation={onViewRackElevation}
          onOpenUnassigned={onOpenUnassigned}
          unassignedCount={unassignedCount}
          onMountDevice={onMountDevice}
        />
      )}

      {persona === "Manager" && (
        <ManagerPersonaView overview={overview} />
      )}
    </div>
  );
};
