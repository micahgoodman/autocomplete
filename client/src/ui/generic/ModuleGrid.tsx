import { ChecklistManager } from '../../modules/checklists/ChecklistManagerModule';
import { ViewMode } from '../../modules/Header';

type Props = {
  /**
   * When true, disables loading of embedded modules within each card.
   * Useful for drag-source grids where you only need top-level items.
   */
  hideEmbedded?: boolean;
  viewMode: ViewMode;
};

/**
 * ModuleGrid Component
 * 
 * A reusable grid layout that displays all module managers.
 */
export function ModuleGrid({ hideEmbedded = false, viewMode }: Props) {
  return (
    <section style={{ marginTop: 24 }}>
      <ChecklistManager hideEmbedded={hideEmbedded} viewMode={viewMode} />
    </section>
  );
}
