// App.js — PlantAR: UI/UX scaffold for an AR science tool (Expo + React Native)
// Focus: Landing → AR View shell → Info Popup. Clean, kid-friendly UI with large touch targets.
// This file builds the full UI flow; swap the AR placeholder with a real AR view later (e.g., ViroReact).

import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import React, { useMemo, useState } from 'react';
import { Dimensions, FlatList, Modal, Pressable, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';

// ───────────────────────────────────────────────────────────────────────────────
// Sample data for organelles (child-friendly copy). Later, fetch from CMS.
// ───────────────────────────────────────────────────────────────────────────────
const ORGANELLES = [
  {
    id: 'nucleus',
    name: 'Nucleus',
    short: "The cell's control center.",
    description:
      'The nucleus is like the brain of the cell. It keeps the DNA safe and tells the cell what to do.',
    emoji: '🧠',
  },
  {
    id: 'mitochondria',
    name: 'Mitochondria',
    short: "The cell's power plants.",
    description:
      'Mitochondria are tiny power stations that turn food into energy so the cell can do its jobs.',
    emoji: '⚡',
  },
  {
    id: 'chloroplast',
    name: 'Chloroplast',
    short: 'Sunlight to sugar!',
    description:
      'Only in plant cells, chloroplasts use sunlight to make food in a process called photosynthesis.',
    emoji: '🌿',
  },
  {
    id: 'cellmembrane',
    name: 'Cell Membrane',
    short: 'A smart border.',
    description:
      'The cell membrane is a flexible skin that protects the cell and decides what gets in or out.',
    emoji: '🛡️',
  },
];

// ───────────────────────────────────────────────────────────────────────────────
// Theme
// ───────────────────────────────────────────────────────────────────────────────
const theme = {
  bg: '#0B1021',
  card: '#141B34',
  accent: '#7AE582',
  accentAlt: '#6EC1FF',
  text: '#F5F7FB',
  textDim: '#B8C1EC',
};

// ───────────────────────────────────────────────────────────────────────────────
// Reusable UI
// ───────────────────────────────────────────────────────────────────────────────
function PrimaryButton({ label, onPress, style }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.primaryBtn,
        pressed && { transform: [{ translateY: 1 }], opacity: 0.95 },
        style,
      ]}
    >
      <Text style={styles.primaryBtnText}>{label}</Text>
    </Pressable>
  );
}

function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function Tag({ children }) {
  return (
    <View style={styles.tag}>
      <Text style={styles.tagText}>{children}</Text>
    </View>
  );
}

function InfoSheet({ visible, onClose, organelle }) {
  const speak = () => {
    if (!organelle) return;
    Speech.stop();
    Speech.speak(`${organelle.name}. ${organelle.description}`, {
      rate: 0.95,
      pitch: 1.0,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.sheetRoot}>
        <View style={styles.sheetHandle} />
        {organelle ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={styles.sheetEmoji}>{organelle.emoji}</Text>
              <Text accessibilityRole="header" style={styles.sheetTitle}>{organelle.name}</Text>
            </View>
            <Text style={styles.sheetSubtitle}>{organelle.short}</Text>
            <Card style={{ marginTop: 16 }}>
              <Text style={styles.body}>{organelle.description}</Text>
            </Card>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
              <PrimaryButton label="🔊 Listen" onPress={speak} />
              <PrimaryButton label="Close" onPress={onClose} style={{ backgroundColor: theme.accentAlt }} />
            </View>
          </>
        ) : (
          <Text style={styles.body}>No organelle selected.</Text>
        )}
      </SafeAreaView>
    </Modal>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
// Landing Screen
// ───────────────────────────────────────────────────────────────────────────────
function LandingScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Tag>PlantAR • Science Lab</Tag>
        <Text accessibilityRole="header" style={styles.title}>Explore Cells in 3D</Text>
        <Text style={styles.subtitle}>Zoom, rotate, and tap organelles to learn how living cells work.</Text>
      </View>

      <Card style={{ marginTop: 8 }}>
        <Text style={[styles.body, { marginBottom: 12 }]}>What you'll do:</Text>
        <View style={{ gap: 8 }}>
          <Bullet>Place a 3D cell in your space</Bullet>
          <Bullet>Tap parts to see what they do</Bullet>
          <Bullet>Listen to friendly explanations</Bullet>
        </View>
      </Card>

      <View style={{ flex: 1 }} />

      <PrimaryButton label="Start Scan" onPress={() => navigation.navigate('ARView')} />

      <View style={{ height: 18 }} />
    </SafeAreaView>
  );
}

function Bullet({ children }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
      <Text style={{ fontSize: 18, color: theme.accent }}>•</Text>
      <Text style={styles.body}>{children}</Text>
    </View>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
// AR View Screen (placeholder container for actual AR)
// ───────────────────────────────────────────────────────────────────────────────
function ARViewScreen() {
  const [selected, setSelected] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Fake hotspots positioned as a fraction of the preview box
  const hotspots = useMemo(
    () => [
      { id: 'nucleus', x: 0.25, y: 0.35 },
      { id: 'mitochondria', x: 0.68, y: 0.52 },
      { id: 'chloroplast', x: 0.45, y: 0.70 },
    ],
    []
  );

  const organelleById = (id) => ORGANELLES.find((o) => o.id === id) || null;

  const onHotspotPress = (id) => {
    const item = organelleById(id);
    setSelected(item);
    setSheetOpen(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const { width } = Dimensions.get('window');
  const previewHeight = Math.min(520, Math.round(width * 1.1));

  return (
    <SafeAreaView style={styles.root}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Tag>Scan Mode</Tag>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Tag>FPS ≥ 30</Tag>
          <Tag>ARKit / ARCore</Tag>
        </View>
      </View>

      {/* AR Placeholder Box */}
      <View
        style={[styles.arBox, { height: previewHeight }]}
        accessibilityLabel="AR camera preview placeholder. Replace with real AR view."
      >
        <Text style={styles.arHint}>Move your device to find a surface…</Text>

        {/* Hotspots overlay */}
        {hotspots.map((h) => (
          <Pressable
            key={h.id}
            accessibilityRole="button"
            onPress={() => onHotspotPress(h.id)}
            style={({ pressed }) => [
              styles.hotspot,
              {
                left: `${h.x * 100}%`,
                top: `${h.y * 100}%`,
                transform: [{ translateX: -12 }, { translateY: -12 }, pressed ? { scale: 0.95 } : { scale: 1 }],
              },
            ]}
          >
            <Text style={styles.hotspotText}>🔎</Text>
          </Pressable>
        ))}
      </View>

      <Card style={{ marginTop: 14 }}>
        <Text style={styles.body}>
          Tap the magnifying glass icons to learn about each organelle. In the real app, you'll tap the model itself!
        </Text>
      </Card>

      <FlatList
        style={{ marginTop: 12 }}
        horizontal
        showsHorizontalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ width: 10 }} />}
        data={ORGANELLES}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <Pressable onPress={() => onHotspotPress(item.id)}>
            <View style={styles.organelleChip}>
              <Text style={styles.organelleEmoji}>{item.emoji}</Text>
              <Text style={styles.organelleName}>{item.name}</Text>
            </View>
          </Pressable>
        )}
      />

      <InfoSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} organelle={selected} />
    </SafeAreaView>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
// Navigation
// ───────────────────────────────────────────────────────────────────────────────
const Stack = createNativeStackNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: theme.bg,
    card: theme.bg,
    text: theme.text,
    border: '#202742',
  },
};

export default function App() {
  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: theme.bg },
          headerTitleStyle: { color: theme.text },
          headerTintColor: theme.accent,
          contentStyle: { backgroundColor: theme.bg },
        }}
      >
        <Stack.Screen name="Home" component={LandingScreen} options={{ title: 'PlantAR' }} />
        <Stack.Screen name="ARView" component={ARViewScreen} options={{ title: 'AR View' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
// Styles
// ───────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.bg,
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  header: { gap: 10, marginTop: 6 },
  title: { fontSize: 32, color: theme.text, fontWeight: '800', letterSpacing: 0.2 },
  subtitle: { fontSize: 16, color: theme.textDim, lineHeight: 22 },
  body: { fontSize: 16, color: theme.text, lineHeight: 22 },
  card: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1F2746',
  },
  tag: {
    alignSelf: 'flex-start',
    backgroundColor: '#0E1533',
    borderColor: '#273058',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  tagText: { color: theme.textDim, fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  primaryBtn: {
    backgroundColor: theme.accent,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    minWidth: 160,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  primaryBtnText: { color: '#06210C', fontWeight: '800', fontSize: 16 },
  sheetRoot: {
    flex: 1,
    backgroundColor: theme.bg,
    paddingHorizontal: 18,
    paddingTop: 10,
    gap: 8,
  },
  sheetHandle: {
    width: 52,
    height: 6,
    borderRadius: 99,
    alignSelf: 'center',
    backgroundColor: '#2A345F',
    marginBottom: 8,
  },
  sheetEmoji: { fontSize: 36 },
  sheetTitle: { fontSize: 28, color: theme.text, fontWeight: '800' },
  sheetSubtitle: { fontSize: 14, color: theme.textDim },
  arBox: {
    marginTop: 12,
    width: '100%',
    backgroundColor: '#070B18',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E2544',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arHint: { color: theme.textDim, fontSize: 14 },
  hotspot: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: theme.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#072813',
  },
  hotspotText: { fontSize: 18 },
  organelleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.card,
    borderColor: '#1F2746',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
  },
  organelleEmoji: { fontSize: 18 },
  organelleName: { color: theme.text, fontWeight: '700' },
});

