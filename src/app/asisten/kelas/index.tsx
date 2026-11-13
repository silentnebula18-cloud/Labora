import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import ClassFormModal from "../../../components/ClassFormModal";
import { useAuth } from "../../../context/AuthContext";
import {
  createClass,
  describeFirestoreError,
  subscribeAssistantClasses,
  type ClassInput,
} from "../../../services/classService";
import type { ClassRecord } from "../../../types";

function formatDibuat(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function KelolaKelasScreen() {
  const { user } = useAuth();

  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [formVisible, setFormVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeAssistantClasses(
      user.id,
      (items) => {
        setClasses(items);
        setLoadError(null);
        setLoading(false);
      },
      (error) => {
        setLoadError(describeFirestoreError(error));
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [user]);

  async function handleCreate(values: ClassInput) {
    if (!user) return;

    setSubmitting(true);
    setFormError(null);

    try {
      await createClass(user.id, values);
      setFormVisible(false);
    } catch (error) {
      setFormError(describeFirestoreError(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>‹ Kembali</Text>
        </Pressable>

        <View style={styles.headerRow}>
          <View style={styles.headerInfo}>
            <Text style={styles.title}>Kelola Kelas</Text>
            <Text style={styles.subtitle}>
              Kelola kelas praktikum dan peserta yang Anda asisteni.
            </Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.addButton,
            pressed && styles.pressed,
          ]}
          onPress={() => {
            setFormError(null);
            setFormVisible(true);
          }}
        >
          <Text style={styles.addButtonText}>＋ Tambah Kelas</Text>
        </Pressable>

        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#1e40af" />
            <Text style={styles.loadingText}>Memuat kelas…</Text>
          </View>
        )}

        {loadError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorBoxText}>{loadError}</Text>
          </View>
        )}

        {!loading && !loadError && classes.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🏫</Text>
            <Text style={styles.emptyTitle}>Belum ada kelas</Text>
            <Text style={styles.emptySubtitle}>
              Tambahkan kelas praktikum pertama Anda untuk mulai mengelola
              peserta.
            </Text>
          </View>
        )}

        {!loading &&
          classes.map((item) => (
            <Pressable
              key={item.id}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
              onPress={() =>
                router.push(`/asisten/kelas/${item.id}` as any)
              }
              android_ripple={{ color: "#e0e7ff" }}
            >
              <View style={styles.cardTop}>
                <View style={styles.kodePill}>
                  <Text style={styles.kodePillText}>
                    Kelas {item.kodeKelas}
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </View>

              <Text style={styles.course} numberOfLines={2}>
                {item.mataKuliah}
              </Text>
              <Text style={styles.meta}>
                Dibuat {formatDibuat(item.createdAt)}
              </Text>
            </Pressable>
          ))}
      </ScrollView>

      {formVisible && (
        <ClassFormModal
          visible
          mode="create"
          submitting={submitting}
          error={formError}
          onSubmit={handleCreate}
          onClose={() => {
            if (!submitting) setFormVisible(false);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },
  content: { padding: 16, paddingBottom: 32 },

  backBtn: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  backText: { fontSize: 16, color: "#1e40af", fontWeight: "600" },

  headerRow: { flexDirection: "row", alignItems: "flex-start" },
  headerInfo: { flex: 1 },
  title: { fontSize: 22, fontWeight: "800", color: "#111827" },
  subtitle: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 19,
    marginTop: 4,
  },

  addButton: {
    backgroundColor: "#1e40af",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 16,
    marginBottom: 16,
  },
  addButtonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  pressed: { opacity: 0.85 },

  loadingBox: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 10,
  },
  loadingText: { fontSize: 13, color: "#6b7280" },

  errorBox: {
    backgroundColor: "#fee2e2",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  errorBoxText: { color: "#b91c1c", fontSize: 13 },

  empty: { alignItems: "center", paddingTop: 40, paddingHorizontal: 24 },
  emptyIcon: { fontSize: 48, marginBottom: 14 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  kodePill: {
    backgroundColor: "#dbeafe",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  kodePillText: { fontSize: 12, fontWeight: "700", color: "#1d4ed8" },
  chevron: { fontSize: 24, color: "#d1d5db" },
  course: { fontSize: 16, fontWeight: "700", color: "#111827" },
  meta: { fontSize: 12, color: "#6b7280", marginTop: 4 },
});
