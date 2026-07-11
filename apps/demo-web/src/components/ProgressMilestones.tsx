import { PROGRESS_MILESTONES } from '../lib/constants.js';

interface ProgressMilestonesProps {
  completedEvents: ReadonlySet<string>;
}

export function ProgressMilestones({ completedEvents }: ProgressMilestonesProps) {
  return (
    <div className="milestones" aria-label="Demo progress">
      {PROGRESS_MILESTONES.map((milestone) => {
        const complete = completedEvents.has(milestone.key);
        return (
          <div
            key={milestone.key}
            className={complete ? 'milestone complete' : 'milestone'}
            data-milestone={milestone.key}
          >
            <span className="milestone-dot" aria-hidden="true" />
            <span>{milestone.label}</span>
          </div>
        );
      })}
    </div>
  );
}
