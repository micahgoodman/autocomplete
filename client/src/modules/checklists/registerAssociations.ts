import { registerAssociationResolver } from '../../ui/generic/associations';
import { fetchChecklists } from '../../api';

registerAssociationResolver('checklist', async (id: string) => {
  const all = await fetchChecklists().catch(() => []);
  const found = all.find((c) => String(c.id) === String(id));
  return found?.name ?? String(id);
});
