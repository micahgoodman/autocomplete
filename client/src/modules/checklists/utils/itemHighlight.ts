import { ChecklistItem } from '../../../api';

/**
 * Determines if a checklist item should be highlighted in red
 * based on urgency level and/or due date.
 * 
 * Items are highlighted if:
 * - Urgency is 'high', OR
 * - Due date is within the next 7 days
 */
export function shouldHighlightItem(item: ChecklistItem): boolean {
  // Don't highlight completed items
  if (item.completed) {
    return false;
  }

  // Highlight if urgency is high
  if (item.urgency === 'high') {
    return true;
  }

  // Highlight if due within the next 7 days
  if (item.dueDate) {
    const dueDate = new Date(item.dueDate);
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    // Check if due date is valid and within the next 7 days
    if (!isNaN(dueDate.getTime()) && dueDate <= sevenDaysFromNow) {
      return true;
    }
  }

  return false;
}

/**
 * Formats a date string for display
 */
export function formatDueDate(dateString: string | null | undefined): string {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  if (itemDate.getTime() === today.getTime()) {
    return 'Today';
  } else if (itemDate.getTime() === tomorrow.getTime()) {
    return 'Tomorrow';
  } else {
    // Format as "Mon, Jan 15"
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  }
}
