import { registerAssociationResolver } from '../../ui/generic/associations';
import { fetchNotes } from '../../api';

registerAssociationResolver('note', async (id: string) => {
  const all = await fetchNotes().catch(() => []);
  const found = all.find((n) => String(n.id) === String(id));
  // Return first 50 characters as title
  if (found) {
    return found.text.substring(0, 50) + (found.text.length > 50 ? '...' : '');
  }
  return String(id);
});
