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
