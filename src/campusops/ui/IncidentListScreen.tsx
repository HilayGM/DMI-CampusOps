import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Incident } from '../domain/Incident';

type Props = Readonly<{
  incidents: readonly Incident[];
  onSelect: (id: string) => void;
  onCreate: () => void;
}>;

export function IncidentListScreen({ incidents, onSelect, onCreate }: Props) {
  return (
    <View style={styles.screen}>
      <View style={styles.headingRow}>
        <Text accessibilityRole="header" style={styles.heading}>Incidencias</Text>
        <Pressable accessibilityRole="button" onPress={onCreate} style={styles.createButton}>
          <Text>Nueva incidencia</Text>
        </Pressable>
      </View>
      <FlatList
        data={incidents}
        keyExtractor={(incident) => incident.id}
        ListEmptyComponent={<Text>No hay incidencias para mostrar.</Text>}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Abrir incidencia: ${item.title}`}
            onPress={() => onSelect(item.id)}
            style={styles.item}
          >
            <Text style={styles.title}>{item.title}</Text>
            <Text>{item.location}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, gap: 12 },
  headingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  heading: { fontSize: 20, fontWeight: '600' },
  createButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, backgroundColor: '#e2e8f0', borderRadius: 8 },
  item: { paddingVertical: 16, gap: 6, borderBottomWidth: 1, borderBottomColor: '#cbd5e1' },
  title: { fontSize: 17, fontWeight: '600' },
});
