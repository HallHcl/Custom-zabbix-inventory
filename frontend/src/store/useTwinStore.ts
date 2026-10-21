import { create } from "zustand";
import type {
  PersonaMode,
  HeatmapOverlay,
  FacilityTelemetry,
  RackTelemetry,
  DeviceTelemetry,
  LiveAlarmEvent,
  SpatialBreadcrumb,
} from "../types/twin";

interface TwinStoreState {
  // 1. Persona Navigation
  persona: PersonaMode;
  setPersona: (mode: PersonaMode) => void;

  // 2. Spatial Hierarchy Selection & Camera Zoom
  selectedSiteId: string;
  selectedBuildingId: string | null;
  selectedRoomId: string | null;
  selectedRowId: string | null;
  selectedRackId: string | null;
  selectedDeviceId: string | null;
  spatialBreadcrumb: SpatialBreadcrumb;

  setSpatialLevel: (level: "site" | "building" | "room" | "row" | "rack", id: string | null, name?: string) => void;
  resetSpatialSelection: () => void;

  // 3. 2D / 3D Canvas Mode & Heatmap Overlays
  viewportMode: "3D" | "2D";
  setViewportMode: (mode: "3D" | "2D") => void;
  toggleViewportMode: () => void;

  activeOverlay: HeatmapOverlay;
  setActiveOverlay: (overlay: HeatmapOverlay) => void;

  // 4. Real-Time Telemetry Cache
  facilityTelemetry: FacilityTelemetry | null;
  racksTelemetry: Record<string, RackTelemetry>;
  devicesTelemetry: Record<string, DeviceTelemetry>;
  activeAlarms: LiveAlarmEvent[];
  lastTelemetryTimestamp: string | null;

  updateFacilityTelemetry: (data: FacilityTelemetry) => void;
  updateRackTelemetry: (rackId: string, data: RackTelemetry) => void;
  setAllRacksTelemetry: (racksMap: Record<string, RackTelemetry>) => void;
  updateDeviceTelemetry: (deviceId: string, data: DeviceTelemetry) => void;
  addAlarmEvent: (alarm: LiveAlarmEvent) => void;
  clearResolvedAlarms: () => void;

  // 5. WebSocket Live Connection
  wsConnected: boolean;
  wsConnecting: boolean;
  wsError: string | null;
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;

  // 6. Global Command Palette (`Cmd + K` Spotlight)
  isSpotlightOpen: boolean;
  openSpotlight: () => void;
  closeSpotlight: () => void;
  toggleSpotlight: () => void;

  // 7. Guided Wizards State
  activeWizard: "ONBOARDING" | "FLOOR_BUILDER" | "MAINTENANCE_SIMULATOR" | null;
  wizardStep: number;
  openWizard: (wizard: "ONBOARDING" | "FLOOR_BUILDER" | "MAINTENANCE_SIMULATOR") => void;
  setWizardStep: (step: number) => void;
  closeWizard: () => void;

  // 8. Agentic AI Copilot Drawer State
  isCopilotOpen: boolean;
  openCopilot: () => void;
  closeCopilot: () => void;
  toggleCopilot: () => void;
}

let socketInstance: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

export const useTwinStore = create<TwinStoreState>((set, get) => ({
  // 1. Persona Navigation
  persona: "NOC",
  setPersona: (persona) => set({ persona }),

  // 2. Spatial Hierarchy
  selectedSiteId: "bkk-dc1",
  selectedBuildingId: null,
  selectedRoomId: null,
  selectedRowId: null,
  selectedRackId: null,
  selectedDeviceId: null,
  spatialBreadcrumb: {
    siteName: "Bangkok DC-1",
  },

  setSpatialLevel: (level, id, name) => {
    set((state) => {
      const crumb = { ...state.spatialBreadcrumb };
      if (level === "site") {
        return {
          selectedSiteId: id || "bkk-dc1",
          selectedBuildingId: null,
          selectedRoomId: null,
          selectedRowId: null,
          selectedRackId: null,
          selectedDeviceId: null,
          spatialBreadcrumb: { siteName: name || "Bangkok DC-1" },
        };
      }
      if (level === "building") {
        crumb.buildingName = name;
        delete crumb.roomName;
        delete crumb.rowName;
        delete crumb.rackName;
        return {
          selectedBuildingId: id,
          selectedRoomId: null,
          selectedRowId: null,
          selectedRackId: null,
          selectedDeviceId: null,
          spatialBreadcrumb: crumb,
        };
      }
      if (level === "room") {
        crumb.roomName = name;
        delete crumb.rowName;
        delete crumb.rackName;
        return {
          selectedRoomId: id,
          selectedRowId: null,
          selectedRackId: null,
          selectedDeviceId: null,
          spatialBreadcrumb: crumb,
        };
      }
      if (level === "row") {
        crumb.rowName = name;
        delete crumb.rackName;
        return {
          selectedRowId: id,
          selectedRackId: null,
          selectedDeviceId: null,
          spatialBreadcrumb: crumb,
        };
      }
      if (level === "rack") {
        crumb.rackName = name;
        return {
          selectedRackId: id,
          spatialBreadcrumb: crumb,
        };
      }
      return state;
    });
  },

  resetSpatialSelection: () => {
    set({
      selectedBuildingId: null,
      selectedRoomId: null,
      selectedRowId: null,
      selectedRackId: null,
      selectedDeviceId: null,
      spatialBreadcrumb: { siteName: "Bangkok DC-1" },
    });
  },

  // 3. Viewport & Heatmap Overlays
  viewportMode: "3D",
  setViewportMode: (viewportMode) => set({ viewportMode }),
  toggleViewportMode: () => set((state) => ({ viewportMode: state.viewportMode === "3D" ? "2D" : "3D" })),

  activeOverlay: "STATUS",
  setActiveOverlay: (activeOverlay) => set({ activeOverlay }),

  // 4. Telemetry State
  facilityTelemetry: null,
  racksTelemetry: {},
  devicesTelemetry: {},
  activeAlarms: [],
  lastTelemetryTimestamp: null,

  updateFacilityTelemetry: (facilityTelemetry) =>
    set({
      facilityTelemetry,
      lastTelemetryTimestamp: facilityTelemetry.timestamp,
    }),

  updateRackTelemetry: (rackId, data) =>
    set((state) => ({
      racksTelemetry: { ...state.racksTelemetry, [rackId]: data },
    })),

  setAllRacksTelemetry: (racksTelemetry) => set({ racksTelemetry }),

  updateDeviceTelemetry: (deviceId, data) =>
    set((state) => ({
      devicesTelemetry: { ...state.devicesTelemetry, [deviceId]: data },
    })),

  addAlarmEvent: (alarm) =>
    set((state) => ({
      activeAlarms: [alarm, ...state.activeAlarms.filter((a) => a.event_id !== alarm.event_id)].slice(0, 50),
    })),

  clearResolvedAlarms: () =>
    set((state) => ({
      activeAlarms: state.activeAlarms.filter((a) => a.event_status === "PROBLEM"),
    })),

  // 5. WebSocket Live Connection
  wsConnected: false,
  wsConnecting: false,
  wsError: null,

  connectWebSocket: () => {
    if (socketInstance && (socketInstance.readyState === WebSocket.OPEN || socketInstance.readyState === WebSocket.CONNECTING)) {
      return;
    }

    set({ wsConnecting: true, wsError: null });

    // Determine WS protocol & host
    const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
    const protocol = isHttps ? "wss:" : "ws:";
    const host = typeof window !== "undefined" ? window.location.hostname : "127.0.0.1";
    // Connect directly to backend port 8000 in development, or reverse proxy in production
    const wsUrl = `${protocol}//${host}:8000/ws/live-twin`;

    try {
      socketInstance = new WebSocket(wsUrl);

      socketInstance.onopen = () => {
        set({ wsConnected: true, wsConnecting: false, wsError: null });
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
      };

      socketInstance.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);

          if (payload.event_type === "INITIAL_STATE") {
            if (payload.facility) {
              get().updateFacilityTelemetry(payload.facility);
            }
            if (payload.racks_summary) {
              get().setAllRacksTelemetry(payload.racks_summary);
            }
          } else if (payload.event_type === "TELEMETRY_REFRESH") {
            if (payload.facility_pue) {
              get().updateFacilityTelemetry({
                total_it_load_kw: payload.total_it_power_kw || 0,
                cooling_load_kw: 0,
                infrastructure_loss_kw: 0,
                total_facility_power_kw: 0,
                pue: payload.facility_pue,
                pue_efficiency_rating: payload.facility_pue < 1.35 ? "EXCELLENT" : "GOOD",
                timestamp: payload.timestamp,
              });
            }
          } else if (payload.event_type === "ZABBIX_ALARM") {
            get().addAlarmEvent(payload as LiveAlarmEvent);
          }
        } catch {
          // Non-JSON ping/pong response
        }
      };

      socketInstance.onclose = () => {
        set({ wsConnected: false, wsConnecting: false });
        // Attempt automatic reconnection in 4 seconds
        if (!reconnectTimer) {
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            get().connectWebSocket();
          }, 4000);
        }
      };

      socketInstance.onerror = () => {
        set({ wsConnected: false, wsConnecting: false, wsError: "WebSocket disconnected" });
      };
    } catch (err: any) {
      set({ wsConnected: false, wsConnecting: false, wsError: err?.message || "Connection failed" });
    }
  },

  disconnectWebSocket: () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (socketInstance) {
      socketInstance.close();
      socketInstance = null;
    }
    set({ wsConnected: false, wsConnecting: false });
  },

  // 6. Global Command Palette (`Cmd + K`)
  isSpotlightOpen: false,
  openSpotlight: () => set({ isSpotlightOpen: true }),
  closeSpotlight: () => set({ isSpotlightOpen: false }),
  toggleSpotlight: () => set((state) => ({ isSpotlightOpen: !state.isSpotlightOpen })),

  // 7. Guided Wizards State
  activeWizard: null,
  wizardStep: 1,
  openWizard: (activeWizard) => set({ activeWizard, wizardStep: 1 }),
  setWizardStep: (wizardStep) => set({ wizardStep }),
  closeWizard: () => set({ activeWizard: null, wizardStep: 1 }),

  // 8. Agentic AI Copilot State
  isCopilotOpen: false,
  openCopilot: () => set({ isCopilotOpen: true }),
  closeCopilot: () => set({ isCopilotOpen: false }),
  toggleCopilot: () => set((state) => ({ isCopilotOpen: !state.isCopilotOpen })),
}));
