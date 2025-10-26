import React from 'react';

export type ModuleCardProps = {
  title: string | React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  // Optional list of associated module instance titles to display
  associations?: Array<{ type: string; title: string }>;
  // Optional heading for the associations section (default: 'Associated with')
  associationsTitle?: string;
};

export function ModuleCard({ title, actions, children, associations, associationsTitle }: ModuleCardProps) {
  return (
    <div className="card">
      <div className="row" style={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <h2>{title}</h2>
        {actions ? <div className="actions">{actions}</div> : null}
      </div>
      {(children || (associations && associations.length > 0)) ? (
        <div className="card-content">
          {children}
          {associations && associations.length > 0 ? (
            <div style={{ 
              marginTop: children ? 16 : 0, 
              paddingTop: children ? 16 : 0, 
              borderTop: children ? '1px solid #f0ede8' : 'none' 
            }}>
              <div className="muted small" style={{ marginBottom: 8 }}>
                {associationsTitle ?? 'Associated with'}
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#6b5d52' }}>
                {associations.map((a, idx) => (
                  <li key={`${a.type}-${idx}`} title={a.type}>
                    {a.title}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
