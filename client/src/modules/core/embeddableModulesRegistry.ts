/**
 * Embeddable Modules Registry
 * 
 * This registry defines which modules can be embedded within other modules, maintaining separation of concerns while enabling composition.
 * 
 * Key Principles:
 * - Each module remains self-contained and knows nothing about being embedded
 * - The registry is the single source of truth for embeddable relationships
 * - Adding new embeddable modules requires only updating this registry
 */

import React from 'react';
import { Context, ModuleAdapter } from '../../adapters/core';

// Adapters
import { ChecklistAdapter } from '../../adapters/checklists/adapter';

// Embeddable Components
import { ChecklistsList } from '../checklists/read/ChecklistsListModule';

/**
 * Common props that all embeddable module components must accept
 */
export type EmbeddedModuleProps = {
  context: Context;
  idPrefix: string;
  onToast?: (message: string) => void;
  title?: string;
  /** Internal: Chain of parent contexts to prevent circular embedding */
  contextChain?: Context[];
};

/**
 * Configuration for an embeddable module type
 */
export type EmbeddableModuleConfig = {
  /** Unique identifier for this module type (e.g., 'category', 'note') */
  moduleType: string;
  
  /** The React component to render for this module type */
  component: React.ComponentType<EmbeddedModuleProps>;
  
  /** The adapter used to query instances of this module type */
  adapter: ModuleAdapter<any, any, any>;
  
  /** Default title to display for this module section */
  defaultTitle: string;
};

/**
 * Union type of all embeddable module types for type safety
 */
export type ModuleTypeKey = 'checklist';

/**
 * Central registry of all embeddable modules
 * 
 * To add a new embeddable module:
 * 1. Import its adapter and embeddable component above
 * 2. Add a new entry to this record with a unique key
 * 3. The module will automatically appear in all parent contexts where it has instances
 */
export const EMBEDDABLE_MODULES_REGISTRY: Record<ModuleTypeKey, EmbeddableModuleConfig> = {
  checklist: {
    moduleType: 'checklist',
    component: ChecklistsList,
    adapter: ChecklistAdapter,
    defaultTitle: 'Checklists',
  },
};

/**
 * Get all registered embeddable module configurations
 */
export function getEmbeddableModules(): EmbeddableModuleConfig[] {
  return Object.values(EMBEDDABLE_MODULES_REGISTRY);
}

/**
 * Get a specific embeddable module configuration by type
 */
export function getEmbeddableModule(moduleType: ModuleTypeKey): EmbeddableModuleConfig | undefined {
  return EMBEDDABLE_MODULES_REGISTRY[moduleType];
}
