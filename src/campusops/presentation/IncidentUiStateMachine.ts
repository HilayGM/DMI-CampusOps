/**
 * IncidentUiStateMachine
 *
 * Máquina de estados formal para la interfaz de CampusOps (Semana 10 - AC-02).
 * Modela con precisión los estados de carga, éxito, vacío, error, cancelación,
 * desconexión, cambios pendientes y conflictos, garantizando navegación
 * predecible, accesibilidad y ausencia de estados de espera permanente.
 */

export type IncidentUiState =
  | 'loading'
  | 'success'
  | 'empty'
  | 'error'
  | 'cancelled'
  | 'offline'
  | 'pending_sync'
  | 'conflict';

export type IncidentUiEvent =
  | { type: 'FETCH' }
  | { type: 'FETCH_SUCCESS'; itemCount: number }
  | { type: 'FETCH_ERROR'; error: string; retryable?: boolean }
  | { type: 'CANCEL' }
  | { type: 'CONNECTION_LOST' }
  | { type: 'CONNECTION_RESTORED' }
  | { type: 'ENQUEUE_OFFLINE_CHANGE'; operationId: string }
  | { type: 'SYNC_START' }
  | { type: 'SYNC_SUCCESS' }
  | { type: 'SYNC_CONFLICT'; conflictingFields: readonly string[] }
  | { type: 'RESOLVE_CONFLICT'; resolution: 'accept_remote' | 'force_local' }
  | { type: 'RETRY' }
  | { type: 'RESET' };

export type UserAction =
  | 'cancel'
  | 'retry'
  | 'go_back'
  | 'refresh'
  | 'create_incident'
  | 'edit'
  | 'change_status'
  | 'add_evidence'
  | 'work_offline'
  | 'reconnect'
  | 'sync_now'
  | 'view_pending'
  | 'resolve_conflict'
  | 'accept_remote'
  | 'force_local';

export type AccessibilityProps = Readonly<{
  accessibilityRole: 'alert' | 'progressbar' | 'header' | 'none';
  accessibilityLabel: string;
  accessibilityLiveRegion: 'polite' | 'assertive' | 'none';
  accessibilityHint?: string;
}>;

export type UiStateMetadata = Readonly<{
  state: IncidentUiState;
  displayName: string;
  isPermanentLoading: false;
  userActions: readonly UserAction[];
  accessibility: AccessibilityProps;
}>;

export interface StateTransitionContext {
  readonly pendingOperationsCount?: number;
  readonly lastError?: string;
  readonly conflictingFields?: readonly string[];
}

/**
 * Función pura de transición de estados de interfaz.
 * Aplica validación estricta y evita transiciones imposibles o bucles de carga.
 */
export function transitionIncidentUiState(
  current: IncidentUiState,
  event: IncidentUiEvent,
): IncidentUiState {
  switch (event.type) {
    case 'RESET':
      return 'empty';

    case 'FETCH':
    case 'RETRY':
      // Desde error, cancelación o refresco, volvemos a carga controlada
      return 'loading';

    case 'FETCH_SUCCESS':
      if (current !== 'loading') {
        // Ignora respuestas tardías si no estamos esperando carga activa
        return current;
      }
      return event.itemCount > 0 ? 'success' : 'empty';

    case 'FETCH_ERROR':
      if (current !== 'loading') return current;
      return 'error';

    case 'CANCEL':
      // Si el usuario cancela una petición activa, se transiciona a cancelado
      // garantizando que no exista una espera permanente.
      if (current === 'loading') {
        return 'cancelled';
      }
      return current;

    case 'CONNECTION_LOST':
      // La pérdida de conexión degrada inmediatamente a offline
      return 'offline';

    case 'CONNECTION_RESTORED':
      if (current === 'offline') {
        return 'loading';
      }
      return current;

    case 'ENQUEUE_OFFLINE_CHANGE':
      if (current === 'offline' || current === 'pending_sync' || current === 'success') {
        return 'pending_sync';
      }
      return current;

    case 'SYNC_START':
      return 'loading';

    case 'SYNC_SUCCESS':
      return 'success';

    case 'SYNC_CONFLICT':
      return 'conflict';

    case 'RESOLVE_CONFLICT':
      if (current === 'conflict') {
        return 'loading';
      }
      return current;

    default:
      return current;
  }
}

/**
 * Retorna las acciones accesibles que el usuario puede ejecutar en un estado determinado.
 */
export function getUserActionsForState(state: IncidentUiState): readonly UserAction[] {
  switch (state) {
    case 'loading':
      return ['cancel'];
    case 'success':
      return ['refresh', 'edit', 'change_status', 'add_evidence'];
    case 'empty':
      return ['create_incident', 'refresh'];
    case 'error':
      return ['retry', 'go_back'];
    case 'cancelled':
      return ['retry', 'go_back'];
    case 'offline':
      return ['work_offline', 'reconnect'];
    case 'pending_sync':
      return ['sync_now', 'view_pending', 'work_offline'];
    case 'conflict':
      return ['resolve_conflict', 'accept_remote', 'force_local'];
  }
}

/**
 * Genera metadatos y etiquetas accesibles para lectores de pantalla
 * garantizando estándares WCAG y de React Native Accessibility.
 */
export function getUiStateMetadata(
  state: IncidentUiState,
  context: StateTransitionContext = {},
): UiStateMetadata {
  switch (state) {
    case 'loading':
      return {
        state,
        displayName: 'Cargando',
        isPermanentLoading: false,
        userActions: getUserActionsForState(state),
        accessibility: {
          accessibilityRole: 'progressbar',
          accessibilityLabel: 'Cargando incidencias del campus. Presione cancelar para detener la espera.',
          accessibilityLiveRegion: 'polite',
          accessibilityHint: 'Espere un momento o cancele para volver a la pantalla anterior.',
        },
      };

    case 'success':
      return {
        state,
        displayName: 'Datos disponibles',
        isPermanentLoading: false,
        userActions: getUserActionsForState(state),
        accessibility: {
          accessibilityRole: 'none',
          accessibilityLabel: 'Incidencias cargadas exitosamente. Listado disponible para consulta.',
          accessibilityLiveRegion: 'polite',
        },
      };

    case 'empty':
      return {
        state,
        displayName: 'Sin registros',
        isPermanentLoading: false,
        userActions: getUserActionsForState(state),
        accessibility: {
          accessibilityRole: 'header',
          accessibilityLabel: 'No se encontraron incidencias activas en el sistema.',
          accessibilityLiveRegion: 'polite',
          accessibilityHint: 'Utilice el botón de nueva incidencia para registrar un reporte.',
        },
      };

    case 'error':
      return {
        state,
        displayName: 'Error de operación',
        isPermanentLoading: false,
        userActions: getUserActionsForState(state),
        accessibility: {
          accessibilityRole: 'alert',
          accessibilityLabel: context.lastError
            ? `Error en la solicitud: ${context.lastError}. Puede presionar reintentar.`
            : 'Error al consultar incidencias de red. Toque reintentar para intentarlo nuevamente.',
          accessibilityLiveRegion: 'assertive',
          accessibilityHint: 'Verifique su conexión o intente reintentar la operación.',
        },
      };

    case 'cancelled':
      return {
        state,
        displayName: 'Operación cancelada',
        isPermanentLoading: false,
        userActions: getUserActionsForState(state),
        accessibility: {
          accessibilityRole: 'none',
          accessibilityLabel: 'Carga de incidencias cancelada por el usuario.',
          accessibilityLiveRegion: 'polite',
          accessibilityHint: 'Toque reintentar para volver a solicitar la información.',
        },
      };

    case 'offline':
      return {
        state,
        displayName: 'Sin conexión',
        isPermanentLoading: false,
        userActions: getUserActionsForState(state),
        accessibility: {
          accessibilityRole: 'alert',
          accessibilityLabel: 'Dispositivo sin conexión a internet. Modo fuera de línea activo con almacenamiento local.',
          accessibilityLiveRegion: 'assertive',
          accessibilityHint: 'Puede seguir trabajando localmente; los cambios se guardarán en la cola persistente.',
        },
      };

    case 'pending_sync':
      return {
        state,
        displayName: 'Cambios pendientes',
        isPermanentLoading: false,
        userActions: getUserActionsForState(state),
        accessibility: {
          accessibilityRole: 'none',
          accessibilityLabel: `Tiene ${context.pendingOperationsCount ?? 'varios'} cambio(s) guardado(s) localmente pendientes de sincronización.`,
          accessibilityLiveRegion: 'polite',
          accessibilityHint: 'Toque sincronizar ahora para enviar los cambios al servidor.',
        },
      };

    case 'conflict':
      return {
        state,
        displayName: 'Conflicto de sincronización',
        isPermanentLoading: false,
        userActions: getUserActionsForState(state),
        accessibility: {
          accessibilityRole: 'alert',
          accessibilityLabel: context.conflictingFields && context.conflictingFields.length > 0
            ? `Conflicto detectado en los campos: ${context.conflictingFields.join(', ')}. Se requiere resolución manual.`
            : 'Conflicto de sincronización con el servidor. Se requiere resolución manual antes de continuar.',
          accessibilityLiveRegion: 'assertive',
          accessibilityHint: 'Elija si desea adoptar los cambios del servidor o conservar sus modificaciones locales.',
        },
      };
  }
}
