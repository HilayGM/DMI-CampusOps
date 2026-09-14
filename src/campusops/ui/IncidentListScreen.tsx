import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Incident } from '../domain/Incident';

type Props = Readonly<{
  incidents: readonly Incident[];
  onSelect: (id: string) => void;
}>;

export function IncidentListScreen({ incidents, onSelect }: Props) {
  return (
    <View style={styles.screen}>
      <Text accessibilityRole="header" style={styles.heading}>Incidencias ficticias</Text>
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
  heading: { fontSize: 20, fontWeight: '600' },
  item: { paddingVertical: 16, gap: 6, borderBottomWidth: 1, borderBottomColor: '#cbd5e1' },
  title: { fontSize: 17, fontWeight: '600' },
});
