export function Header() {
  return (
    <header>
      <div className="container">
        <div className="header-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/logo.png" alt="Nesting Modules Test" style={{ width: '64px', height: '64px' }} />
            <h1>Autocomplete</h1>
          </div>
        </div>
      </div>
    </header>
  );
}
