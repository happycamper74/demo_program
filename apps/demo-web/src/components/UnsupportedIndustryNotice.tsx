import { UNSUPPORTED_INDUSTRY_NOTICE } from '../lib/constants.js';

export function UnsupportedIndustryNotice() {
  return (
    <div className="notice" role="status">
      <strong>{UNSUPPORTED_INDUSTRY_NOTICE.title}</strong>
      <p className="muted">{UNSUPPORTED_INDUSTRY_NOTICE.message}</p>
    </div>
  );
}
