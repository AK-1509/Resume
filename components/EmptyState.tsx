import type { Skill } from "@/lib/schema";

/**
 * Shown when a filter matches nothing anywhere.
 *
 * An empty screen is an instruction, not a shrug: where dropping one skill
 * would produce results, it names that skill and the number, so the reader has
 * something to do rather than something to feel.
 */
export function EmptyState({
  relaxation,
  onRelax,
  onClear,
}: {
  relaxation: { skill: Skill; count: number } | null;
  onRelax: (skillId: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="border-s-2 border-claret bg-panel p-6">
      <p className="font-sans text-body font-semibold text-strong">
        No experiences match all selected skills.
      </p>

      {relaxation && (
        <p className="mt-2 max-w-[65ch] font-sans text-body text-soft">
          Removing {relaxation.skill.label} would show {relaxation.count} experience
          {relaxation.count === 1 ? "" : "s"}.
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        {relaxation && (
          <button
            type="button"
            onClick={() => onRelax(relaxation.skill.id)}
            className="rounded-[2px] bg-claret px-5 py-3 font-sans text-ui font-medium text-white transition-colors hover:bg-claret-dim"
          >
            Remove {relaxation.skill.label}
          </button>
        )}
        <button
          type="button"
          onClick={onClear}
          className="rounded-[2px] border border-rule px-5 py-3 font-sans text-ui font-medium text-strong transition-colors hover:border-accent"
        >
          Clear filters
        </button>
      </div>
    </div>
  );
}
