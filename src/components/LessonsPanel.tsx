import type { Lesson, LessonEvaluation } from "../lib/lessons";

export interface LessonsPanelProps {
  lessons: Lesson[];
  activeLessonId: string | null;
  /** Live evaluation of the active lesson; null when no lesson is open. */
  evaluation: LessonEvaluation | null;
  onStart: (lessonId: string) => void;
  onExit: () => void;
}

export function LessonsPanel({
  lessons,
  activeLessonId,
  evaluation,
  onStart,
  onExit,
}: LessonsPanelProps) {
  if (activeLessonId === null || evaluation === null) {
    return (
      <>
        <div className="panel-header">
          <p className="eyebrow">Learn to play</p>
          <h2 className="heading">Pick a lesson</h2>
        </div>
        <p>
          Short, hands-on lessons. Each step checks itself off as you build the
          beat on the grid.
        </p>
        <div className="lesson-list">
          {lessons.map((lesson) => (
            <button
              className="lesson-card"
              type="button"
              key={lesson.id}
              onClick={() => onStart(lesson.id)}
            >
              <strong>{lesson.title}</strong>
              <span>{lesson.blurb}</span>
              <small>{lesson.steps.length} steps</small>
            </button>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <div className="panel-header split">
        <div>
          <p className="eyebrow">Learn to play</p>
          <h2 className="heading">{evaluation.title}</h2>
        </div>
        <button className="button secondary compact" type="button" onClick={onExit}>
          All lessons
        </button>
      </div>
      <p className="lesson-progress">
        {evaluation.completedCount} / {evaluation.total} done
      </p>
      {evaluation.allDone ? (
        <p className="lesson-complete">
          ✓ Lesson complete — nice work. Pick another, or keep playing.
        </p>
      ) : null}
      <ol className="lesson-steps">
        {evaluation.steps.map((step) => (
          <li
            className={[
              "lesson-step",
              step.done ? "done" : "",
              step.active ? "active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            key={step.id}
          >
            <span
              className="lesson-step__mark"
              aria-label={step.done ? "done" : step.active ? "current step" : "to do"}
            >
              {step.done ? "✓" : step.active ? "▶" : "○"}
            </span>
            <span className="lesson-step__body">
              <span className="lesson-step__instruction">{step.instruction}</span>
              {step.hint && step.active && !step.done ? (
                <span className="lesson-step__hint">{step.hint}</span>
              ) : null}
            </span>
          </li>
        ))}
      </ol>
    </>
  );
}
