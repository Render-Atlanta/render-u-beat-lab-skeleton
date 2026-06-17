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
