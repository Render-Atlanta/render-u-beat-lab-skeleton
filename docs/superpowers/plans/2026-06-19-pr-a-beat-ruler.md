# PR-A — Beat-number Ruler Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add a `1 2 3 4` beat ruler above the 16-step grid, aligned to the step columns, with the current beat highlighted during playback (brief fidelity).

**Architecture:** A presentational ruler row inside `.step-grid`, reusing the `.track-row` 17-column grid template (label spacer + 16 step columns) so each beat number spans 4 step columns. Current beat = `Math.floor(activeStep / 4)`.

**Tech Stack:** React, TypeScript, Vitest (`renderToStaticMarkup` string assertions), CSS in `src/styles.css`.

## Global Constraints
- Gate: `npm run check` + `npx tsc --noEmit`. No GitHub Actions CI. CodeRabbit non-blocking.
- Brief fidelity: each beat number spans 4 sixteenth-steps (`grid-column: span 4`), aligned to the existing grid; keep current downbeat marks + playhead untouched.
- `.track-row` grid template is `minmax(148px, 180px) repeat(16, minmax(16px, 1fr))` — the ruler must match it.

---

### Task 1: Beat ruler in SequencerPanel

**Files:**
- Modify: `src/components/SequencerPanel.tsx` (add ruler at top of `.step-grid`)
- Modify: `src/styles.css` (ruler styles)
- Test: `src/components/SequencerPanel.test.tsx` (add a ruler test)

**Interfaces:**
- Consumes: existing `activeStep: number | null` prop.
- Produces: none (presentational).

- [ ] **Step 1: Write the failing test** (append to `SequencerPanel.test.tsx`)

```tsx
describe("beat ruler", () => {
  it("renders four beat numbers 1-4", () => {
    const markup = renderPanel({ activeStep: null });
    expect(markup).toContain('aria-label="Beat ruler"');
    for (const n of ["1", "2", "3", "4"]) {
      expect(markup).toMatch(new RegExp(`beat-ruler__beat[^>]*>${n}<`));
    }
    expect(markup).not.toContain("is-current");
  });

  it("highlights the current beat from activeStep", () => {
    // activeStep 5 -> floor(5/4) = beat index 1 -> the "2" cell is current
    const markup = renderPanel({ activeStep: 5 });
    expect(markup).toMatch(/beat-ruler__beat[^>]*is-current[^>]*>2</);
    expect(markup).not.toMatch(/beat-ruler__beat[^>]*is-current[^>]*>1</);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/SequencerPanel.test.tsx`
Expected: FAIL (no `beat-ruler` markup yet).

- [ ] **Step 3: Add the ruler** — in `SequencerPanel.tsx`, immediately inside the `<div className="step-grid" …>` opening tag, before `{visibleInstruments.map(...)}`:

```tsx
<div className="beat-ruler" aria-label="Beat ruler">
  <span className="beat-ruler__spacer" aria-hidden="true" />
  {[1, 2, 3, 4].map((beat) => (
    <span
      key={beat}
      className={`beat-ruler__beat${
        activeStep !== null && Math.floor(activeStep / 4) === beat - 1
          ? " is-current"
          : ""
      }`}
    >
      {beat}
    </span>
  ))}
</div>
```

- [ ] **Step 4: Add CSS** in `src/styles.css` (near `.track-row`, ~line 379):

```css
.beat-ruler {
  display: grid;
  grid-template-columns: minmax(148px, 180px) repeat(16, minmax(16px, 1fr));
  align-items: end;
  margin-bottom: 6px;
}
.beat-ruler__spacer {
  grid-column: 1;
}
.beat-ruler__beat {
  grid-column: span 4;
  text-align: center;
  font-size: 0.72rem;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
  opacity: 0.55;
}
.beat-ruler__beat.is-current {
  opacity: 1;
  font-weight: 700;
}
```
(If a theme accent variable exists, color `.is-current` with it; otherwise the weight/opacity bump is enough. Confirm by reading neighbors in `styles.css` during impl.)

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/SequencerPanel.test.tsx`
Expected: PASS.

- [ ] **Step 6: Full gate + commit**

Run: `npx tsc --noEmit && npm run check`
Then:
```bash
git add src/components/SequencerPanel.tsx src/components/SequencerPanel.test.tsx src/styles.css
git commit -m "PR-A: beat-number ruler above the step grid"
```

## Self-review
- Spec coverage: ruler 1–4 spanning 4 columns ✓, current-beat highlight ✓, downbeat/playhead untouched ✓.
- The transport label (brief's Playing/Stopped/bar readout) is a smaller separate nicety; confirm during impl whether one already exists and only add if missing (out of this task's required scope).
