interface ScenarioGuidanceProps {
  examples: readonly string[];
}

export function ScenarioGuidance({ examples }: ScenarioGuidanceProps) {
  return (
    <div className="stack">
      <p>
        Use one of these plumbing scenario ideas to guide your conversation. This is guidance only,
        not a script to read word for word.
      </p>
      <ul className="scenario-list">
        {examples.map((example) => (
          <li key={example}>{example}</li>
        ))}
      </ul>
      <p className="muted">
        Speak naturally about a realistic customer problem. The demo shows how LeadBoard handles the
        call without requiring a rehearsed script.
      </p>
    </div>
  );
}

export function containsForbiddenScriptLanguage(text: string): boolean {
  const normalized = text.toLowerCase();
  return (
    normalized.includes('full script') ||
    normalized.includes('read this word for word') ||
    normalized.includes('say exactly')
  );
}
