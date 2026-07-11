import type {
  BindIncomingCallRequest,
  BindIncomingCallResponse,
  CreateDemoSessionMirrorRequest,
  CreateDemoSessionMirrorResponse,
  DemoSessionStatusResponse,
  GetRestrictedLeadViewRequest,
  PurgeTemporaryDemoDataResponse,
  RestrictedLeadViewData,
} from './types.js';

export interface LeadBoardClient {
  createDemoSessionMirror(
    request: CreateDemoSessionMirrorRequest,
  ): Promise<CreateDemoSessionMirrorResponse>;

  getDemoSessionStatus(leadboardDemoSessionId: string): Promise<DemoSessionStatusResponse>;

  bindIncomingCall(request: BindIncomingCallRequest): Promise<BindIncomingCallResponse>;

  getRestrictedLeadView(request: GetRestrictedLeadViewRequest): Promise<RestrictedLeadViewData>;

  purgeTemporaryDemoData(leadboardDemoSessionId: string): Promise<PurgeTemporaryDemoDataResponse>;
}
