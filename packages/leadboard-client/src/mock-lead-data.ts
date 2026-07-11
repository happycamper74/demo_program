import type { RestrictedLeadViewData } from './types.js';

export function createMockRestrictedLeadViewData(input: {
  leadId: string;
  businessName: string;
  contactName: string;
  phoneNumber: string;
  industry: string;
}): RestrictedLeadViewData {
  const occurredAt = new Date().toISOString();

  return {
    header: {
      leadId: input.leadId,
      businessName: input.businessName,
      contactName: input.contactName,
      phoneNumber: input.phoneNumber,
      industry: input.industry,
    },
    transcript: [
      {
        speaker: 'caller',
        text: 'Hi, I have a blocked kitchen sink and need help today.',
        timestamp: occurredAt,
      },
      {
        speaker: 'agent',
        text: 'I can help with that. Can I get your address and preferred arrival window?',
        timestamp: occurredAt,
      },
    ],
    summary:
      'Caller reported a blocked kitchen sink and requested same-day plumbing assistance. Agent collected service details for dispatch.',
    timeline: [
      {
        id: 'timeline_call_received',
        title: 'Call received',
        description: 'Inbound demo call connected to AI receptionist.',
        occurredAt,
      },
      {
        id: 'timeline_transcript_ready',
        title: 'Transcript ready',
        description: 'Call transcript stored for lead review.',
        occurredAt,
      },
      {
        id: 'timeline_summary_ready',
        title: 'Summary ready',
        description: 'AI summary generated for the temporary lead.',
        occurredAt,
      },
    ],
  };
}
