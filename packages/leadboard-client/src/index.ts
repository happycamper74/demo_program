export const PACKAGE_NAME = '@experience-platform/leadboard-client' as const;

export type { LeadBoardClient } from './leadboard-client.js';
export { createLeadBoardClient, loadLeadBoardClientConfigFromEnv } from './config.js';
export { MockLeadBoardClient } from './mock-leadboard-client.js';
export { RealLeadBoardClient } from './real-leadboard-client.js';
export {
  ActiveCallAlreadyExistsError,
  BindIncomingCallUnsupportedError,
  DemoSessionMirrorNotFoundError,
  LeadBoardApiError,
  LeadBoardConfigurationError,
  LeadBoardRealAdapterNotAvailableError,
  PhoneNumberMismatchError,
  PurgeOperationFailedError,
  RestrictedLeadAccessDeniedError,
  RestrictedLeadNotReadyError,
} from './errors.js';
export type {
  BindIncomingCallRequest,
  BindIncomingCallResponse,
  CreateDemoSessionMirrorRequest,
  CreateDemoSessionMirrorResponse,
  DemoProcessingState,
  DemoSessionMirrorStatus,
  DemoSessionStatusResponse,
  GetRestrictedLeadViewRequest,
  LeadBoardAdapterMode,
  LeadBoardClientConfig,
  LeadBoardProcessingEvent,
  MockLeadBoardClientConfig,
  RealLeadBoardClientConfig,
  PurgeTemporaryDemoDataResponse,
  RestrictedLeadHeader,
  RestrictedLeadTimelineEntry,
  RestrictedLeadTranscriptEntry,
  RestrictedLeadViewData,
} from './types.js';
