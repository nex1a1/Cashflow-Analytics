import { useAppData } from '../../context/AppDataContext';
import { useAppFilter } from '../../context/AppFilterContext';
import { useAppUI } from '../../context/AppUIContext';
import { useToast } from '../../context/ToastContext';

/**
 * Backward-compatible facade for useAppController.
 * Refactored in Phase 3 to delegate directly to individual contexts:
 * AppDataContext, AppFilterContext, AppUIContext, and ToastContext.
 */
export function useAppController() {
  const toast = useToast();
  const ui = useAppUI();
  const data = useAppData();
  const filter = useAppFilter();

  return {
    ...toast,
    ...ui,
    ...data,
    ...filter,
  };
}

export default useAppController;
