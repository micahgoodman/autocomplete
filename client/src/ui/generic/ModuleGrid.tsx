import { ChecklistManager } from '../../modules/checklists/ChecklistManagerModule';

type Props = {
  /**
   * When true, disables loading of embedded modules within each card.
   * Useful for drag-source grids where you only need top-level items.
   */
  hideEmbedded?: boolean;
};

/**
 * ModuleGrid Component
 * 
 * A reusable grid layout that displays all module managers.
 */
export function ModuleGrid({ hideEmbedded = false }: Props) {
  return (
    <section style={{ marginTop: 24 }}>
      <ChecklistManager hideEmbedded={hideEmbedded} />
    </section>
  );
}
