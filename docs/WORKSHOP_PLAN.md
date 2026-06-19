# Workshop Plan

## Teaching arc

1. Show the finished beat loop first.
2. Open the spec and ask what could go wrong.
3. Turn the spec into small tickets.
4. Implement or inspect PR-01: playable shell.
5. Add one behavior with tests.
6. Show how the same workflow applies to non-music projects.

## Skeleton build path

### Part 1: Make sound

- Create app shell.
- Add one kick sound.
- Add a 16-step scheduler.
- Add Trap pattern.

### Part 2: Make it teach

- Add style presets.
- Add beat coach copy.
- Explain BPM, swing, and drum lanes in plain language.

### Part 3: Make it real

- Add microphone permission.
- Capture taps.
- Detect and quantize hits.

### Part 4: Make it yours

- Add producer tag.
- Save/share pattern.
- Deploy to Vercel.

## Reusable AI workflow demonstrated

```md
Given a feature request:
1. Restate the user-visible outcome.
2. Identify browser/platform constraints.
3. Create a smallest testable prototype.
4. Add deterministic tests around non-UI logic.
5. Add UI states for success, loading, and failure.
6. Verify locally.
7. Promote the slice to a ticket or PR.
```

## Demo safety

- Keep manual patterns available if microphone permission fails.
- Use synthesized drums so no sample rights are involved.
- Use table taps before beatboxing; taps are easier to detect.
- Run the hosted version over HTTPS for mic access.
