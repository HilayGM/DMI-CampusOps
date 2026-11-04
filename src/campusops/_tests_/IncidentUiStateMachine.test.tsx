import { act, fireEvent, render } from '@testing-library/react-native';

import {
  type IncidentUiState,
  getUiStateMetadata,
  getUserActionsForState,
  transitionIncidentUiState,
} from '../presentation/IncidentUiStateMachine';
import { IncidentStateView } from '../ui/IncidentStateView';

describe('IncidentUiStateMachine & IncidentStateView (Week 10 - Martín)', () => {
  describe('Nominal UI State Transitions', () => {
    it('transitions from loading to success when data is received', () => {
      const next = transitionIncidentUiState('loading', {
        type: 'FETCH_SUCCESS',
        itemCount: 5,
      });
      expect(next).toBe('success');
    });

    it('transitions from loading to empty when list has zero items', () => {
      const next = transitionIncidentUiState('loading', {
        type: 'FETCH_SUCCESS',
        itemCount: 0,
      });
      expect(next).toBe('empty');
    });

    it('transitions from success back to loading upon refresh or new fetch', () => {
      const next = transitionIncidentUiState('success', { type: 'FETCH' });
      expect(next).toBe('loading');
    });

    it('resets to empty on explicit RESET event', () => {
      const next = transitionIncidentUiState('error', { type: 'RESET' });
      expect(next).toBe('empty');
    });
  });

  describe('Boundary Cases & Prevention of Infinite Loading', () => {
    it('cancels active loading and prevents infinite spinner', () => {
      const next = transitionIncidentUiState('loading', { type: 'CANCEL' });
      expect(next).toBe('cancelled');
    });

    it('ignores late responses when request was already cancelled', () => {
      const next = transitionIncidentUiState('cancelled', {
        type: 'FETCH_SUCCESS',
        itemCount: 3,
      });
      expect(next).toBe('cancelled');
    });

    it('transitions to offline when connection is lost during loading', () => {
      const next = transitionIncidentUiState('loading', { type: 'CONNECTION_LOST' });
      expect(next).toBe('offline');
    });

    it('transitions from offline to loading when connection is restored', () => {
      const next = transitionIncidentUiState('offline', { type: 'CONNECTION_RESTORED' });
      expect(next).toBe('loading');
    });

    it('transitions to pending_sync when local change is queued in offline mode', () => {
      const next = transitionIncidentUiState('offline', {
        type: 'ENQUEUE_OFFLINE_CHANGE',
        operationId: 'op-001-local-edit',
      });
      expect(next).toBe('pending_sync');
    });

    it('handles synchronization conflict detection and manual resolution', () => {
      const inConflict = transitionIncidentUiState('loading', {
        type: 'SYNC_CONFLICT',
        conflictingFields: ['status', 'assignedTechnicianId'],
      });
      expect(inConflict).toBe('conflict');

      const resolving = transitionIncidentUiState(inConflict, {
        type: 'RESOLVE_CONFLICT',
        resolution: 'accept_remote',
      });
      expect(resolving).toBe('loading');
    });
  });

  describe('Failure and Recovery Transitions', () => {
    it('transitions to error when fetch fails with error message', () => {
      const next = transitionIncidentUiState('loading', {
        type: 'FETCH_ERROR',
        error: 'Network request timed out',
      });
      expect(next).toBe('error');
    });

    it('recovers from error to loading when RETRY is triggered', () => {
      const next = transitionIncidentUiState('error', { type: 'RETRY' });
      expect(next).toBe('loading');
    });

    it('ignores fetch error if state is no longer loading', () => {
      const next = transitionIncidentUiState('offline', {
        type: 'FETCH_ERROR',
        error: 'Ignored late error',
      });
      expect(next).toBe('offline');
    });
  });

  describe('Accessibility Metadata & WCAG Semantics', () => {
    const allStates: IncidentUiState[] = [
      'loading',
      'success',
      'empty',
      'error',
      'cancelled',
      'offline',
      'pending_sync',
      'conflict',
    ];

    it('guarantees every state has non-empty accessibility label and valid role', () => {
      for (const state of allStates) {
        const metadata = getUiStateMetadata(state, {
          lastError: 'HTTP 500 Server Error',
          pendingOperationsCount: 2,
          conflictingFields: ['work'],
        });
        expect(metadata.accessibility.accessibilityLabel.length).toBeGreaterThan(10);
        expect(['alert', 'progressbar', 'header', 'none']).toContain(
          metadata.accessibility.accessibilityRole,
        );
        expect(metadata.isPermanentLoading).toBe(false);
      }
    });

    it('provides accessible actions for every state without dead ends', () => {
      for (const state of allStates) {
        const actions = getUserActionsForState(state);
        expect(actions.length).toBeGreaterThan(0);
      }
    });

    it('includes specific conflicting fields in accessibility label when in conflict state', () => {
      const metadata = getUiStateMetadata('conflict', {
        conflictingFields: ['assignedTechnicianId', 'work'],
      });
      expect(metadata.accessibility.accessibilityLabel).toContain('assignedTechnicianId');
      expect(metadata.accessibility.accessibilityRole).toBe('alert');
    });
  });

  describe('IncidentStateView Component Rendering', () => {
    it('renders loading indicator and allows user cancellation', async () => {
      const onCancel = jest.fn();
      const view = await render(
        <IncidentStateView state="loading" onCancel={onCancel} />,
      );

      expect(view.getByTestId('loading-indicator')).toBeTruthy();
      expect(view.getByText('Cargando')).toBeTruthy();

      const cancelButton = view.getByText('Cancelar');
      await act(async () => {
        fireEvent.press(cancelButton);
      });
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('renders error state with accessible alert role and retry action', async () => {
      const onRetry = jest.fn();
      const view = await render(
        <IncidentStateView
          state="error"
          context={{ lastError: 'Timeout al conectar con el servidor' }}
          onRetry={onRetry}
        />,
      );

      expect(view.getByText('Error de operación')).toBeTruthy();
      const retryButton = view.getByText('Reintentar');
      await act(async () => {
        fireEvent.press(retryButton);
      });
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('renders offline banner with reconnection action', async () => {
      const onReconnect = jest.fn();
      const view = await render(
        <IncidentStateView state="offline" onReconnect={onReconnect} />,
      );

      expect(view.getByText('Modo Fuera de Línea')).toBeTruthy();
      const reconnectButton = view.getByText('Reconectar');
      await act(async () => {
        fireEvent.press(reconnectButton);
      });
      expect(onReconnect).toHaveBeenCalledTimes(1);
    });

    it('renders conflict resolution options', async () => {
      const onResolveConflict = jest.fn();
      const view = await render(
        <IncidentStateView
          state="conflict"
          context={{ conflictingFields: ['status'] }}
          onResolveConflict={onResolveConflict}
        />,
      );

      expect(view.getByText('Conflicto de sincronización')).toBeTruthy();
      const acceptRemoteButton = view.getByText('Aceptar versión remota');
      await act(async () => {
        fireEvent.press(acceptRemoteButton);
      });
      expect(onResolveConflict).toHaveBeenCalledWith('accept_remote');

      const forceLocalButton = view.getByText('Conservar cambios locales');
      await act(async () => {
        fireEvent.press(forceLocalButton);
      });
      expect(onResolveConflict).toHaveBeenCalledWith('force_local');
    });
  });
});
