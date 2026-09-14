import { useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import type { IncidentQueries } from '../application/incidentQueries';
import type { BackendHealthPort } from '../application/ports/BackendHealthPort';
import type { Incident } from '../domain/Incident';
import { IncidentDetailScreen } from './IncidentDetailScreen';
import { IncidentListScreen } from './IncidentListScreen';

type Props = Readonly<{
  incidents: IncidentQueries;
  checkBackendHealth: BackendHealthPort;
}>;
type QueryState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'list'; items: readonly Incident[] }
  | { status: 'detail'; incident: Incident | null };

export function CampusOpsScreen({ incidents, checkBackendHealth }: Props) {
  const [backendStatus, setBackendStatus] = useState<'checking' | 'available' | 'offline'>('checking');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState<QueryState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    async function checkHealth() {
      try {
        await checkBackendHealth();
        if (active) setBackendStatus('available');
      } catch {
        if (active) setBackendStatus('offline');
      }
    }
    void checkHealth();
    return () => { active = false; };
  }, [checkBackendHealth]);

  useEffect(() => {
    let active = true;
    async function load() {
      // Wait one microtask before transitioning. This keeps the effect
      // asynchronous and makes an obsolete request cancellable.
      await Promise.resolve();
      if (!active) return;
      setQuery({ status: 'loading' });
      try {
        const result: QueryState = selectedId === null
          ? { status: 'list', items: await incidents.list() }
          : { status: 'detail', incident: await incidents.getById(selectedId) };
        if (active) setQuery(result);
      } catch {
        if (active) setQuery({ status: 'error' });
      }
    }
    void load();
    return () => { active = false; };
  }, [incidents, selectedId, attempt]);

  useEffect(() => {
    if (selectedId === null) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setSelectedId(null);
      return true;
    });
    return () => subscription.remove();
  }, [selectedId]);

  return (
    <View style={styles.screen}>
      <View accessibilityRole="summary" style={styles.header}>
        <Text style={styles.title}>CampusOps</Text>
        <Text>Incidencias del campus · entorno académico ficticio</Text>
        <Text testID="backend-status">Backend: {backendStatus}</Text>
      </View>
      {selectedId !== null && (
        <Pressable accessibilityRole="button" onPress={() => setSelectedId(null)} style={styles.button}>
          <Text>Volver</Text>
        </Pressable>
      )}
      {query.status === 'loading' && (
        <View style={styles.header}>
          <ActivityIndicator accessibilityLabel="Cargando incidencias" />
          <Text>Cargando incidencias…</Text>
        </View>
      )}
      {query.status === 'error' && (
        <View style={styles.header}>
          <Text accessibilityRole="alert">No se pudieron cargar las incidencias.</Text>
          <Pressable accessibilityRole="button" onPress={() => setAttempt((value) => value + 1)} style={styles.button}>
            <Text>Reintentar</Text>
          </Pressable>
        </View>
      )}
      {query.status === 'list' && selectedId === null && (
        <IncidentListScreen incidents={query.items} onSelect={setSelectedId} />
      )}
      {query.status === 'detail' && selectedId !== null && (
        query.incident
          ? <IncidentDetailScreen incident={query.incident} />
          : <Text>No se encontró la incidencia.</Text>
      )}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 24, paddingTop: 48, paddingBottom: 24, gap: 16 },
  header: { gap: 8 },
  title: { fontSize: 24, fontWeight: '700' },
  button: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 16, backgroundColor: '#e2e8f0', borderRadius: 8 },
});
