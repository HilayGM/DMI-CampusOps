import { ScrollView, StyleSheet, Text } from 'react-native';

import type { IncidentCategory, IncidentStatus } from '../contracts';
import type { Incident } from '../domain/Incident';

const statusLabels: Record<IncidentStatus, string> = {
  open: 'Abierta', assigned: 'Asignada', in_progress: 'En proceso',
  resolved: 'Resuelta', closed: 'Cerrada',
};
const categoryLabels: Record<IncidentCategory, string> = {
  electrical: 'Electricidad', laboratory: 'Laboratorio', water: 'Agua',
  connectivity: 'Conectividad', equipment: 'Equipamiento',
  safety: 'Seguridad', maintenance: 'Mantenimiento',
};

export function IncidentDetailScreen({ incident }: Readonly<{ incident: Incident }>) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text accessibilityRole="header" style={styles.heading}>Detalle de incidencia</Text>
      <Text style={styles.title}>{incident.title}</Text>
      <Text>ID: {incident.id}</Text>
      <Text>{incident.description}</Text>
      <Text>Estado: {statusLabels[incident.status]}</Text>
      <Text>Categoría: {categoryLabels[incident.category]}</Text>
      <Text>Ubicación: {incident.location}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, paddingBottom: 24 },
  heading: { fontSize: 20, fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '600' },
});
