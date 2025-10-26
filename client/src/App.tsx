import { Header } from './modules/Header';
import { ModuleGrid } from './ui/generic/ModuleGrid';
// Register association resolvers (each module registers its own)
import './modules/checklists/registerAssociations';

export default function App() {
  return (
    <div>
      <Header />
      <main className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <ModuleGrid />
      </main>
    </div>
  );
}
