import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LessonsPanel } from "./LessonsPanel";
import { LESSONS, type LessonEvaluation } from "../lib/lessons";

function noop() {}

describe("LessonsPanel", () => {
  it("lists every lesson when none is open", () => {
    const html = renderToStaticMarkup(
      <LessonsPanel
        lessons={LESSONS}
        activeLessonId={null}
        evaluation={null}
        onStart={noop}
        onExit={noop}
      />,
    );
    expect(html).toContain("Pick a lesson");
    for (const lesson of LESSONS) {
      expect(html).toContain(lesson.title);
      expect(html).toContain(lesson.blurb);
    }
  });

  it("renders the active lesson's steps with ticks, progress, and the active hint", () => {
    const evaluation: LessonEvaluation = {
      lessonId: "demo",
      title: "Demo lesson",
      total: 3,
      completedCount: 1,
      allDone: false,
      steps: [
        { id: "a", instruction: "Step A", done: true, active: false },
        { id: "b", instruction: "Step B", hint: "do B", done: false, active: true },
        { id: "c", instruction: "Step C", done: false, active: false },
      ],
    };
    const html = renderToStaticMarkup(
      <LessonsPanel
        lessons={LESSONS}
        activeLessonId="demo"
        evaluation={evaluation}
        onStart={noop}
        onExit={noop}
      />,
    );
    expect(html).toContain("Demo lesson");
    expect(html).toContain("1 / 3 done");
    expect(html).toContain("✓"); // done mark on step A
    expect(html).toContain("Step B");
    expect(html).toContain("do B"); // hint shown for the active step
    expect(html).not.toContain("Lesson complete");
  });

  it("celebrates when every step is done", () => {
    const evaluation: LessonEvaluation = {
      lessonId: "demo",
      title: "Demo lesson",
      total: 1,
      completedCount: 1,
      allDone: true,
      steps: [{ id: "a", instruction: "Step A", done: true, active: false }],
    };
    const html = renderToStaticMarkup(
      <LessonsPanel
        lessons={LESSONS}
        activeLessonId="demo"
        evaluation={evaluation}
        onStart={noop}
        onExit={noop}
      />,
    );
    expect(html).toContain("Lesson complete");
  });
});
