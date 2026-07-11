import { INDUSTRY_OPTIONS } from '../lib/constants.js';

interface IndustrySelectorProps {
  value: string;
  onChange: (industry: string) => void;
}

export function IndustrySelector({ value, onChange }: IndustrySelectorProps) {
  return (
    <div className="field">
      <label htmlFor="industry">Your business industry</label>
      <select
        id="industry"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Select an industry</option>
        {INDUSTRY_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
