/**
 * EmbeddedModules Component
 * 
 * A universal component that renders all embeddable modules for a given parent context.
 * This component:
 * - Queries each registered module type for instances in the parent context
 * - Only renders module types that have at least one instance
 * - Maintains separation of concerns by delegating to module-specific components
 * - Eliminates the need for manual wiring in individual card components
 */

import React, { useMemo } from 'react';
import { Context, useModuleList } from '../../adapters/core';
import { getEmbeddableModules, EmbeddableModuleConfig } from '../../modules/core/embeddableModulesRegistry';

export type EmbeddedModulesProps = {
  /** The context of the parent module (e.g., { type: 'organization', id: '123' }) */
  parentContext: Context;
  
  /** Prefix for DOM IDs to ensure uniqueness (e.g., 'org-123') */
  parentIdPrefix: string;
  
  /** Callback for showing toast notifications */
  onToast?: (message: string) => void;
  
  /** Optional top-level margin override (default: 16px) */
  marginTop?: number;
  
  /** 
   * Internal: Chain of parent contexts to prevent circular embedding.
   * Passed through list components to cards, which forward to nested EmbeddedModules.
   */
  contextChain?: Context[];
};

/**
 * Hook to fetch items for a single embeddable module type
 */
function useEmbeddableModule(config: EmbeddableModuleConfig, context: Context) {
  const { items, loading } = useModuleList(config.adapter, { context });
  return { config, items, loading };
}

/**
 * Component that renders a single embeddable module section
 */
function EmbeddableModuleSection({
  config,
  items,
  parentContext,
  parentIdPrefix,
  onToast,
  marginTop = 16,
  contextChain = [],
}: {
  config: EmbeddableModuleConfig;
  items: any[];
  parentContext: Context;
  parentIdPrefix: string;
  onToast?: (message: string) => void;
  marginTop?: number;
  contextChain?: Context[];
}) {
  const Component = config.component;
  const idPrefix = `${parentIdPrefix}-${config.moduleType}`;
  
  // Only render if there are items
  if (items.length === 0) {
    return null;
  }
  
  return (
    <div style={{ marginTop }}>
      <Component
        context={parentContext}
        idPrefix={idPrefix}
        onToast={onToast}
        title={config.defaultTitle}
        contextChain={contextChain}
      />
    </div>
  );
}

/**
 * Helper function to check if a context is already in the chain (circular reference)
 */
function isCircularReference(context: Context, chain: Context[]): boolean {
  return chain.some(c => c.type === context.type && c.id === context.id);
}

/**
 * Main EmbeddedModules component
 */
export function EmbeddedModules({
  parentContext,
  parentIdPrefix,
  onToast,
  marginTop = 16,
  contextChain = [],
}: EmbeddedModulesProps) {
  // Check for circular reference
  if (isCircularReference(parentContext, contextChain)) {
    return (
      <div style={{ marginTop, padding: '16px', backgroundColor: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px' }}>
        <small className="muted">
          ⚠️ Circular embedding detected. Module <strong>{parentContext.type}:{parentContext.id}</strong> is already in the parent chain.
        </small>
      </div>
    );
  }
  
  // Build the new chain by appending current context
  const newChain = [...contextChain, parentContext];
  
  // Get all registered embeddable modules
  const embeddableModules = useMemo(() => getEmbeddableModules(), []);
  
  // Fetch data for each module type
  const moduleData = embeddableModules.map(config => 
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEmbeddableModule(config, parentContext)
  );
  
  // Check if any modules are still loading
  const isLoading = moduleData.some(({ loading }) => loading);
  
  // Filter to only modules with items
  // Note: moduleData changes on every render due to map, but this is acceptable
  // since we need to respond to changes in items/loading state immediately
  const modulesWithItems = moduleData.filter(({ items }) => items.length > 0);
  
  // Show loading state while fetching
  if (isLoading) {
    return (
      <div style={{ marginTop, textAlign: 'center', padding: '24px' }}>
        <span className="spinner" style={{ marginRight: '8px' }} />
        <span className="muted">Loading embedded modules...</span>
      </div>
    );
  }
  
  // If no modules have items, render nothing
  if (modulesWithItems.length === 0) {
    return null;
  }
  
  // Render all modules with items
  return (
    <>
      {modulesWithItems.map(({ config, items }) => (
        <EmbeddableModuleSection
          key={config.moduleType}
          config={config}
          items={items}
          parentContext={parentContext}
          parentIdPrefix={parentIdPrefix}
          onToast={onToast}
          marginTop={marginTop}
          contextChain={newChain}
        />
      ))}
    </>
  );
}
