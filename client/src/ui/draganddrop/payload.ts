import React from 'react';
import { ModuleDragPayload } from './types';

const MIME = 'application/x-module-item';

export function setDragData(e: React.DragEvent, payload: ModuleDragPayload) {
  try {
    e.dataTransfer.setData(MIME, JSON.stringify(payload));
  } catch {
    // noop
  }
  try {
    e.dataTransfer.setData('text/plain', `${payload.moduleType}:${payload.id}`);
  } catch {
    // noop
  }
  try {
    e.dataTransfer.effectAllowed = 'copyMove';
  } catch {
    // noop
  }
}

export function parseDragData(e: React.DragEvent): ModuleDragPayload | null {
  try {
    const json = e.dataTransfer.getData(MIME);
    if (json) {
      const parsed = JSON.parse(json);
      if (parsed && typeof parsed.moduleType === 'string' && typeof parsed.id === 'string') return parsed;
    }
  } catch {
    // fall through
  }
  try {
    const txt = e.dataTransfer.getData('text/plain');
    if (txt && typeof txt === 'string' && txt.includes(':')) {
      const [moduleType, id] = txt.split(':', 2);
      if (moduleType && id) return { moduleType, id };
    }
  } catch {
    // noop
  }
  return null;
}
