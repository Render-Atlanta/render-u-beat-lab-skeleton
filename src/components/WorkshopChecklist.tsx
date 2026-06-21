import type { ProducerTagTrigger } from "../lib/producerTag";

export interface WorkshopChecklistProps {
  styleName: string;
  activeSteps: number;
  tagReady: boolean;
  tagTrigger: ProducerTagTrigger;
  arrangementBars: number;
  exportReady: boolean;
  onOpenTag: () => void;
  onOpenArrange: () => void;
}

interface ChecklistItem {
  label: string;
  detail: string;
  done: boolean;
}

export function WorkshopChecklist({
  styleName,
  activeSteps,
  tagReady,
  tagTrigger,
  arrangementBars,
  exportReady,
  onOpenTag,
  onOpenArrange,
}: WorkshopChecklistProps) {
  const items: ChecklistItem[] = [
    {
      label: "Pocket",
      detail: styleName,
      done: Boolean(styleName),
    },
    {
      label: "Beat",
      detail: `${activeSteps} hits`,
      done: activeSteps > 0,
    },
    {
      label: "Tag",
      detail: tagReady ? `${tagTrigger} trigger` : "add producer tag",
      done: tagReady,
    },
    {
      label: "Export",
      detail: exportReady ? "ready" : `${arrangementBars} bars`,
      done: exportReady,
    },
  ];
  const completeCount = items.filter((item) => item.done).length;

  return (
    <section className="panel workshop-checklist" aria-label="Workshop path">
      <div className="workshop-checklist__head">
        <div>
          <p className="eyebrow">Workshop path</p>
          <strong>{completeCount} of {items.length} ready</strong>
        </div>
        <div className="workshop-checklist__actions">
          <button className="button secondary compact" type="button" onClick={onOpenTag}>
            Tag
          </button>
          <button
            className="button secondary compact"
            type="button"
            onClick={onOpenArrange}
          >
            Export
          </button>
        </div>
      </div>
      <ol className="workshop-checklist__items">
        {items.map((item) => (
          <li className={item.done ? "done" : ""} key={item.label}>
            <span aria-hidden="true">{item.done ? "OK" : "--"}</span>
            <div>
              <strong>{item.label}</strong>
              <small>{item.detail}</small>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
