import React from 'react';

const WORK_TYPE_OPTIONS = [
  { key: 'email', icon: '📧', title: 'Email related' },
  { key: 'coding', icon: '💻', title: 'Coding / development' },
  { key: 'calendar', icon: '📅', title: 'Calendar / scheduling' },
] as const;

export type WorkTypeKey = typeof WORK_TYPE_OPTIONS[number]['key'];

type ChecklistWorkTypeSelectorProps = {
  workTypes?: Partial<Record<WorkTypeKey, boolean>>;
  disabled?: boolean;
  onChange: (type: WorkTypeKey, value: boolean) => void;
};

export function ChecklistWorkTypeSelector({
  workTypes,
  disabled = false,
  onChange,
}: ChecklistWorkTypeSelectorProps) {
  return (
    <div className="checklist-item-work-types">
      {WORK_TYPE_OPTIONS.map(({ key, icon, title }) => (
        <label key={key} className="checklist-item-work-type" title={title}>
          <input
            type="checkbox"
            checked={Boolean(workTypes?.[key])}
            onChange={(event) => onChange(key, event.target.checked)}
            disabled={disabled}
            className="checklist-item-work-type-input"
          />
          <span aria-hidden="true" className="checklist-item-work-type-icon">
            {icon}
          </span>
        </label>
      ))}
    </div>
  );
}
