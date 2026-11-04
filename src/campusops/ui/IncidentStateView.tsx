import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  type IncidentUiState,
  type StateTransitionContext,
  getUiStateMetadata,
} from '../presentation/IncidentUiStateMachine';

type Props = Readonly<{
  state: IncidentUiState;
  context?: StateTransitionContext;
  onRetry?: () => void;
  onCancel?: () => void;
  onGoBack?: () => void;
  onSyncNow?: () => void;
  onResolveConflict?: (resolution: 'accept_remote' | 'force_local') => void;
  onCreateIncident?: () => void;
  onReconnect?: () => void;
}>;

export function IncidentStateView({
  state,
  context,
  onRetry,
  onCancel,
  onGoBack,
  onSyncNow,
  onResolveConflict,
  onCreateIncident,
  onReconnect,
}: Props) {
  const metadata = getUiStateMetadata(state, context);
  const { accessibility } = metadata;

  return (
    <View
      style={[styles.container, state === 'offline' && styles.offlineBanner, state === 'conflict' && styles.conflictBanner]}
      accessibilityRole={accessibility.accessibilityRole}
      accessibilityLabel={accessibility.accessibilityLabel}
      accessibilityLiveRegion={accessibility.accessibilityLiveRegion}
      accessibilityHint={accessibility.accessibilityHint}
    >
      {state === 'loading' && (
        <View style={styles.centerBlock}>
          <ActivityIndicator size="large" color="#2563eb" testID="loading-indicator" />
          <Text style={styles.stateTitle}>{metadata.displayName}</Text>
          <Text style={styles.stateDescription}>{accessibility.accessibilityLabel}</Text>
          {onCancel && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancelar carga de incidencias"
              accessibilityHint="Interrumpe la espera activa y regresa al estado cancelado"
              onPress={onCancel}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </Pressable>
          )}
        </View>
      )}

      {state === 'empty' && (
        <View style={styles.centerBlock}>
          <Text style={styles.stateTitle}>{metadata.displayName}</Text>
          <Text style={styles.stateDescription}>{accessibility.accessibilityLabel}</Text>
          {onCreateIncident && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Crear nueva incidencia"
              onPress={onCreateIncident}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Nueva incidencia</Text>
            </Pressable>
          )}
        </View>
      )}

      {state === 'error' && (
        <View style={styles.centerBlock}>
          <Text style={[styles.stateTitle, styles.errorText]}>{metadata.displayName}</Text>
          <Text style={styles.stateDescription}>{accessibility.accessibilityLabel}</Text>
          <View style={styles.buttonRow}>
            {onRetry && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Reintentar carga de incidencias"
                onPress={onRetry}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>Reintentar</Text>
              </Pressable>
            )}
            {onGoBack && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Volver a la pantalla anterior"
                onPress={onGoBack}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>Volver</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}

      {state === 'cancelled' && (
        <View style={styles.centerBlock}>
          <Text style={styles.stateTitle}>{metadata.displayName}</Text>
          <Text style={styles.stateDescription}>{accessibility.accessibilityLabel}</Text>
          <View style={styles.buttonRow}>
            {onRetry && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Reiniciar consulta de incidencias"
                onPress={onRetry}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>Reintentar consulta</Text>
              </Pressable>
            )}
            {onGoBack && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Volver al inicio"
                onPress={onGoBack}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>Volver</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}

      {state === 'offline' && (
        <View style={styles.bannerBlock}>
          <Text style={styles.bannerTitle}>Modo Fuera de Línea</Text>
          <Text style={styles.bannerDescription}>{accessibility.accessibilityLabel}</Text>
          {onReconnect && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Comprobar conexión a internet"
              onPress={onReconnect}
              style={styles.compactButton}
            >
              <Text style={styles.compactButtonText}>Reconectar</Text>
            </Pressable>
          )}
        </View>
      )}

      {state === 'pending_sync' && (
        <View style={styles.bannerBlock}>
          <Text style={styles.bannerTitle}>Cambios Pendientes de Sincronización</Text>
          <Text style={styles.bannerDescription}>{accessibility.accessibilityLabel}</Text>
          {onSyncNow && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sincronizar cambios ahora"
              onPress={onSyncNow}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Sincronizar ahora</Text>
            </Pressable>
          )}
        </View>
      )}

      {state === 'conflict' && (
        <View style={styles.centerBlock}>
          <Text style={[styles.stateTitle, styles.conflictText]}>{metadata.displayName}</Text>
          <Text style={styles.stateDescription}>{accessibility.accessibilityLabel}</Text>
          {onResolveConflict && (
            <View style={styles.buttonColumn}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Adoptar versión del servidor y descartar edición local"
                onPress={() => onResolveConflict('accept_remote')}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>Aceptar versión remota</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Conservar versión local y sobrescribir en el servidor"
                onPress={() => onResolveConflict('force_local')}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>Conservar cambios locales</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 24,
    width: '100%',
  },
  bannerBlock: {
    width: '100%',
    padding: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f59e0b',
    gap: 6,
  },
  offlineBanner: {
    backgroundColor: '#fffbeb',
  },
  conflictBanner: {
    backgroundColor: '#fef2f2',
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
  },
  stateDescription: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 20,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#92400e',
  },
  bannerDescription: {
    fontSize: 13,
    color: '#78350f',
  },
  errorText: {
    color: '#dc2626',
  },
  conflictText: {
    color: '#b91c1c',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  buttonColumn: {
    width: '100%',
    gap: 10,
    marginTop: 12,
  },
  primaryButton: {
    minHeight: 44,
    minWidth: 120,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    minHeight: 44,
    minWidth: 120,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  secondaryButtonText: {
    color: '#1e293b',
    fontSize: 15,
    fontWeight: '600',
  },
  cancelButton: {
    minHeight: 44,
    minWidth: 100,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  cancelButtonText: {
    color: '#b91c1c',
    fontSize: 14,
    fontWeight: '600',
  },
  compactButton: {
    minHeight: 36,
    backgroundColor: '#d97706',
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  compactButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
});
