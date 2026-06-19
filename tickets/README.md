# Render U Beat Lab Backlog

Markdown tickets live with the workshop so each slice can become a PR or GitHub
issue.

To promote a ticket after the GitHub repo exists:

```bash
gh issue create --repo William-Hill/render-u-beat-lab --title "<title>" --body-file tickets/PR-XX-name.md
```

Suggested sequence for fastest testable prototypes:

| ID | Title | Type | Depends on |
| --- | --- | --- | --- |
| [PR-01](PR-01-scaffold-playable-shell.md) | Scaffold playable shell | Foundation | - |
| [PR-02](PR-02-editable-step-sequencer.md) | Editable step sequencer | Feature | PR-01 |
| [PR-03](PR-03-beat-coach.md) | Beat coach learning layer | Feature | PR-01 |
| [PR-04](PR-04-mic-capture-spike.md) | Microphone capture spike | Spike | PR-01 |
| [PR-05](PR-05-onset-detection-quantization.md) | Onset detection + quantization | Feature | PR-04 |
| [PR-06](PR-06-beatbox-lane-classification.md) | Beatbox lane classification | Feature | PR-05 |
| [PR-07](PR-07-producer-tag.md) | Producer tag | Feature | PR-01 |
| [PR-08](PR-08-arrangement-and-export.md) | Arrangement + export | Feature | PR-02, PR-07 |
| [PR-09](PR-09-render-deploy.md) | Render static deploy | Infrastructure | PR-01 |
| [PR-10](PR-10-workshop-agent-workflows.md) | Workshop AI workflow prompts | Teaching | PR-01 |
| [PR-11](PR-11-audio-engine-adapter.md) | Audio engine adapter | Architecture | PR-01 |
| [PR-12](PR-12-tonejs-sample-engine-spike.md) | Tone.js sample engine spike | Spike | PR-11 |
| [PR-13](PR-13-licensed-drum-sample-kit.md) | Licensed drum sample kit | Feature | PR-12 |
| [PR-14](PR-14-meyda-beatbox-analysis-spike.md) | Meyda beatbox analysis spike | Spike | PR-06 |
| [PR-15](PR-15-reference-profile-analyzer.md) | Reference profile analyzer | Tooling | PR-03 |
| [PR-16](PR-16-app-component-decomposition.md) | App component decomposition | Quality | PR-03, PR-06, PR-08 |
| [PR-17](PR-17-pure-beat-domain-functions.md) | Pure beat domain functions | Quality | PR-02, PR-03 |
| [PR-18](PR-18-audio-contract-tests.md) | Audio contract tests | Quality | PR-11 |
| [PR-19](PR-19-code-size-and-module-hygiene.md) | Code size and module hygiene | Quality | PR-16, PR-17 |
| [PR-20](PR-20-test-fixtures-and-golden-patterns.md) | Test fixtures and golden patterns | Quality | PR-03, PR-06 |
| [PR-21](PR-21-open-licensed-reference-examples.md) | Open-licensed reference examples | Content | PR-13, PR-15 |

## Beginner-experience roadmap

Research-backed features to help an absolute beginner (a software builder, not a
musician) learn production. Sequenced in three waves by learning-impact ÷
effort. See `docs/superpowers/specs/` for the per-wave design.

| ID | Title | Type | Wave | Depends on |
| --- | --- | --- | --- | --- |
| [PR-22](PR-22-playhead-step-highlighting.md) | Playhead step highlighting | Feature | 1 | PR-11 |
| [PR-23](PR-23-instrument-role-coaching.md) | Instrument role coaching | Feature | 1 | PR-01 |
| [PR-24](PR-24-eq-spectrum-visualizer.md) | EQ / spectrum visualizer | Feature | 1 | PR-11 |
| [PR-25](PR-25-producer-tag-set-and-record.md) | Producer tag: set and record | Feature | 2 | PR-04, PR-07 |
| [PR-26](PR-26-producer-tag-in-the-beat.md) | Producer tag in the beat | Feature | 2 | PR-22, PR-25, PR-08 |
| [PR-27](PR-27-curated-extra-instruments.md) | Curated extra instruments (clap + 808) | Feature | 3 | PR-02, PR-11 |
| [PR-28](PR-28-in-key-melody-lane.md) | In-key melody lane | Feature | 3 | PR-27 |
| [PR-29](PR-29-guided-layering-mode.md) | Guided layering mode | Teaching | 3 | PR-23, PR-27 |
| [PR-30](PR-30-per-lane-volume-mixer.md) | Per-lane volume mixer | Feature | 3 | PR-02, PR-11 |
| [PR-31](PR-31-pitched-bass.md) | Pitched bass (notes on 808) | Feature | 3 | PR-27, PR-28 |

Waves 1 (visual feedback: PR-22/23/24) and 2 (producer tag: PR-25/26) are
shipped. Remaining Wave 3 work — extra instruments (PR-27 808/clap), in-key
melody (PR-28), guided layering (PR-29), the per-lane volume mixer (PR-30), and
the pitched "bass guitar" follow-up (PR-31). The bass progression is **PR-27
(tuned 808 now) → PR-31 (per-step in-key notes later)**.

## Beat Lab redesign roadmap (Wave 4)

Imported from the `claude.ai/design` project "Drum app redesign cleanup"
(`Beat Lab.dc.html`). The shell (PR-32) re-skins and restructures the app to the
new design and ships first; PR-33…PR-36 add the net-new behaviors the design
introduces. Each later ticket lands as its own tested PR.

| ID | Title | Type | Wave | Depends on |
| --- | --- | --- | --- | --- |
| [PR-32](PR-32-beat-lab-redesign-shell.md) | Beat Lab visual redesign shell | Feature | 4 | PR-29, PR-30, PR-31 |
| [PR-33](PR-33-per-step-velocity-and-paint.md) | Per-step velocity + drag-to-paint | Feature | 4 | PR-30, PR-32 |
| [PR-34](PR-34-undo-redo-autosave-share.md) | Undo/redo, autosave & compact share | Feature | 4 | PR-32, PR-33 |
| [PR-35](PR-35-count-in-and-metronome.md) | Count-in & metronome | Feature | 4 | PR-11, PR-32 |
| [PR-36](PR-36-tap-tempo.md) | Tap tempo | Feature | 4 | PR-32 |
