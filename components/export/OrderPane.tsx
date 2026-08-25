"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { formatDuration } from "@/lib/format";
import type { Experience } from "@/lib/schema";

/**
 * Drag-and-drop reorder of the selected entries.
 *
 * Snaps to a single vertical list — no free positioning. dnd-kit's keyboard
 * sensor makes the whole thing operable with Space to lift, arrows to move and
 * Space to drop, which is the reason for choosing it.
 */
export function OrderPane({
  entries,
  onReorder,
}: {
  entries: Experience[];
  onReorder: (ids: string[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = entries.map((e) => e.id);
    onReorder(arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))));
  }

  if (entries.length === 0) {
    return (
      <p className="font-sans text-body text-soft">
        Nothing selected yet. Choose at least one experience on the Select tab.
      </p>
    );
  }

  return (
    <>
      <p className="mb-4 max-w-[65ch] font-sans text-body text-soft">
        Drag to reorder, or focus an entry and press Space, then use the arrow keys and Space again
        to drop. Entries are grouped by section when printed; this sets the order within each.
      </p>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        // Vertical-axis only. `restrictToParentElement` is deliberately not
        // used: it clamps the keyboard sensor's computed coordinates inside a
        // scrollable pane, which silently makes arrow-key reordering do
        // nothing. The sorting strategy already snaps to a single column.
        modifiers={[restrictToVerticalAxis]}
      >
        <SortableContext items={entries.map((e) => e.id)} strategy={verticalListSortingStrategy}>
          <ul className="flex flex-col gap-2">
            {entries.map((entry) => (
              <SortableRow key={entry.id} entry={entry} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </>
  );
}

function SortableRow({ entry }: { entry: Experience }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: entry.id,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 rounded-[2px] border border-rule bg-panel p-3 ${
        isDragging ? "opacity-60" : ""
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab rounded-[2px] border border-rule p-2 text-soft transition-colors hover:border-accent active:cursor-grabbing"
        aria-label={`Reorder ${entry.title}`}
      >
        <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true" fill="currentColor">
          <circle cx="6" cy="4" r="1.2" />
          <circle cx="10" cy="4" r="1.2" />
          <circle cx="6" cy="8" r="1.2" />
          <circle cx="10" cy="8" r="1.2" />
          <circle cx="6" cy="12" r="1.2" />
          <circle cx="10" cy="12" r="1.2" />
        </svg>
      </button>

      <div className="min-w-0 flex-1">
        <p className="truncate font-sans text-ui font-medium text-strong">{entry.title}</p>
        <p className="metadata text-soft">
          {entry.organization ? `${entry.organization} · ` : ""}
          {formatDuration(entry.startDate, entry.endDate)}
        </p>
      </div>
    </li>
  );
}
