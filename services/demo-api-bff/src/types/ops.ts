export type OpsIncidentPriority = 'critical' | 'high' | 'medium' | 'low';

export type OpsActionType = 'retry' | 'cleanup' | 'investigate';

export interface OpsIncident {
  readonly incident_id: string;
  readonly priority: OpsIncidentPriority;
  readonly title: string;
  readonly description: string;
  readonly experience_session_id: string | null;
  readonly action_type: OpsActionType;
  readonly created_at: string;
}

export interface LiveSessionView {
  readonly experience_session_id: string;
  readonly prospect_name: string;
  readonly business_name: string;
  readonly industry: string;
  readonly experience_definition_id: string;
  readonly state: string;
  readonly current_stage: string;
  readonly elapsed_seconds: number;
  readonly incident_id: string | null;
}

export interface SessionTimelineEvent {
  readonly event_name: string;
  readonly occurred_at: string;
  readonly label: string;
}

export interface SessionHistoryEntry {
  readonly experience_session_id: string;
  readonly prospect_name: string;
  readonly business_name: string;
  readonly email: string;
  readonly phone_number: string;
  readonly industry: string;
  readonly experience_definition_id: string;
  readonly state: string;
  readonly started_at: string;
  readonly completed_at: string | null;
  readonly timeline: readonly SessionTimelineEvent[];
}

export interface SessionHistoryFilters {
  readonly prospect_name?: string;
  readonly business_name?: string;
  readonly email?: string;
  readonly phone?: string;
  readonly industry?: string;
  readonly experience_session_id?: string;
  readonly started_after?: string;
  readonly started_before?: string;
}

export type PlatformHealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface PlatformHealthComponent {
  readonly component: string;
  readonly status: PlatformHealthStatus;
  readonly message: string;
}

export interface PlatformHealthResponse {
  readonly components: readonly PlatformHealthComponent[];
  readonly generated_at: string;
}

export interface OpsActionResult {
  readonly incident_id: string;
  readonly status: 'accepted' | 'completed';
  readonly message: string;
}
