import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import type { IncidentCategory } from '../contracts';
import type { CreateIncidentInput } from '../application/ports/IncidentRepository';

type Props = Readonly<{
  onCancel: () => void;
  onSubmit: (input: CreateIncidentInput, idempotencyKey: string) => Promise<void>;
}>;

const categories: readonly Readonly<{ value: IncidentCategory; label: string }>[] = [
  { value: 'electrical', label: 'Electricidad' },
  { value: 'laboratory', label: 'Laboratorio' },
  { value: 'water', label: 'Agua' },
  { value: 'connectivity', label: 'Conectividad' },
  { value: 'equipment', label: 'Equipamiento' },
  { value: 'safety', label: 'Seguridad' },
  { value: 'maintenance', label: 'Mantenimiento' },
];

function createIdempotencyKey(): string {
  if (typeof globalThis.crypto?.randomUUID !== 'function') {
    throw new Error('UUID generation is unavailable');
  }
  return globalThis.crypto.randomUUID();
}

export function IncidentCreateScreen({ onCancel, onSubmit }: Props) {
  const [category, setCategory] = useState<IncidentCategory>('maintenance');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);

  function updateCategory(value: IncidentCategory) {
    setCategory(value);
    setPendingKey(null);
  }

  function updateDescription(value: string) {
    setDescription(value);
    setPendingKey(null);
  }

  function updateLocation(value: string) {
    setLocation(value);
    setPendingKey(null);
  }

  async function submit() {
    const input: CreateIncidentInput = {
      category,
      description: description.trim(),
      location: location.trim(),
    };
    if (!input.description || !input.location) {
      setError(true);
      return;
    }

    let idempotencyKey = pendingKey;
    try {
      idempotencyKey ??= createIdempotencyKey();
    } catch {
      setError(true);
      return;
    }

    setPendingKey(idempotencyKey);
    setSubmitting(true);
    setError(false);
    try {
      await onSubmit(input, idempotencyKey);
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text accessibilityRole="header" style={styles.heading}>Nueva incidencia</Text>
      <Text style={styles.label}>Categoría</Text>
      <View style={styles.categories}>
        {categories.map((item) => (
          <Pressable
            key={item.value}
            accessibilityRole="button"
            accessibilityState={{ selected: category === item.value }}
            onPress={() => updateCategory(item.value)}
            style={[styles.category, category === item.value && styles.categorySelected]}
          >
            <Text>{item.label}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        accessibilityLabel="Descripción"
        placeholder="Describe la incidencia"
        multiline
        value={description}
        onChangeText={updateDescription}
        style={[styles.input, styles.multiline]}
      />
      <TextInput
        accessibilityLabel="Ubicación"
        placeholder="Ubicación"
        value={location}
        onChangeText={updateLocation}
        style={styles.input}
      />
      {error && <Text accessibilityRole="alert">No se pudo crear la incidencia. Revisa los datos e inténtalo de nuevo.</Text>}
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={onCancel} disabled={submitting} style={styles.secondaryButton}>
          <Text>Cancelar</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => void submit()} disabled={submitting} style={styles.primaryButton}>
          <Text>{submitting ? 'Creando…' : 'Crear incidencia'}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, paddingBottom: 24 },
  heading: { fontSize: 20, fontWeight: '600' },
  label: { fontWeight: '600' },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  category: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 12, borderWidth: 1, borderColor: '#94a3b8', borderRadius: 8 },
  categorySelected: { backgroundColor: '#cbd5e1', borderColor: '#334155' },
  input: { minHeight: 48, paddingHorizontal: 12, borderWidth: 1, borderColor: '#94a3b8', borderRadius: 8 },
  multiline: { minHeight: 104, paddingTop: 12, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  primaryButton: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 16, backgroundColor: '#bfdbfe', borderRadius: 8 },
  secondaryButton: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 16, backgroundColor: '#e2e8f0', borderRadius: 8 },
});