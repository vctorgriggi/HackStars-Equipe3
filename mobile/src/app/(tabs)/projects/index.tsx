import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';

import { ProjectCard } from '@/components/project-card';
import { TraelFonts } from '@/constants/theme';
import { PROJECTS } from '@/data/trael';
import { useTheme } from '@/hooks/use-theme';

export default function ProjectsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { q: initialQuery } = useLocalSearchParams<{ q?: string }>();
  const [q, setQ] = useState(initialQuery ?? '');
  // Sincroniza durante o render (não em efeito) quando a busca chega por
  // navegação de Clientes com o mesmo screen já montado na aba.
  const [syncedQuery, setSyncedQuery] = useState(initialQuery);
  if (initialQuery !== syncedQuery) {
    setSyncedQuery(initialQuery);
    setQ(initialQuery ?? '');
  }
  const list = PROJECTS.filter(
    (p) =>
      !q.trim() ||
      (p.lote + ' ' + p.desc).toLowerCase().includes(q.trim().toLowerCase()) ||
      p.units.some((u) => u.serial.toLowerCase().includes(q.trim().toLowerCase())),
  );
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps={'handled'}>
      <Text style={{ fontFamily: TraelFonts.sansBold, fontSize: 24, color: theme.text1 }}>Projetos</Text>
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder={'Buscar lote, cliente ou nº de série'}
        placeholderTextColor={theme.text3}
        style={{
          height: 44,
          backgroundColor: theme.surface1,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 8,
          paddingHorizontal: 12,
          color: theme.text1,
          fontFamily: TraelFonts.sans,
          fontSize: 13,
        }}
      />
      <View style={{ gap: 10 }}>
        {list.map((p) => (
          <ProjectCard key={p.id} project={p} onPress={() => router.push(`/projects/${p.id}`)} />
        ))}
      </View>
    </ScrollView>
  );
}
