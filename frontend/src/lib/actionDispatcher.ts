import { useTwinStore } from '../store/useTwinStore'
import type { CopilotAction } from '../types'
import type { PersonaMode, HeatmapOverlay } from '../types/twin'

export interface ActionDispatchHandlers {
  onNavigateToRack?: (rackNameOrId: string) => void
  onOpenProvisioningWizard?: (rackId: number | string, startU: number, uHeight: number, category?: string) => void
  onOpenBlastRadius?: (deviceId: number | string, deviceName?: string) => void
  onNavigateToTab?: (tab: string) => void
}

/**
 * Dispatches an automated or user-confirmed action returned by the AI Copilot.
 * Updates Zustand store, spatial camera targets, heatmap shaders, or opens guided wizard dialogs.
 */
export function dispatchCopilotAction(
  action: CopilotAction,
  handlers: ActionDispatchHandlers = {}
): void {
  const store = useTwinStore.getState()

  switch (action.type) {
    case 'FLY_TO_RACK': {
      const rackName = action.payload.rack_name || action.payload.rack_id
      if (rackName && handlers.onNavigateToRack) {
        handlers.onNavigateToRack(rackName)
      }
      break
    }

    case 'OPEN_PROVISIONING_WIZARD': {
      const { rack_id, rack_name, start_u, u_height, category } = action.payload
      if (handlers.onOpenProvisioningWizard) {
        handlers.onOpenProvisioningWizard(rack_id || rack_name, start_u || 1, u_height || 2, category)
      }
      break
    }

    case 'OPEN_BLAST_RADIUS': {
      const { device_id, device_name } = action.payload
      if (handlers.onOpenBlastRadius) {
        handlers.onOpenBlastRadius(device_id, device_name)
      }
      break
    }

    case 'SET_HEATMAP': {
      const mode = (action.payload.mode || 'STATUS').toUpperCase()
      if (['THERMAL', 'POWER', 'SPACE', 'STATUS'].includes(mode)) {
        store.setActiveOverlay(mode as HeatmapOverlay)
      }
      break
    }

    case 'SET_PERSONA': {
      const persona = action.payload.persona
      if (['NOC', 'Supervisor', 'Manager'].includes(persona)) {
        store.setPersona(persona as PersonaMode)
      }
      break
    }

    default:
      console.warn('Unhandled copilot action type:', action.type, action.payload)
  }
}
