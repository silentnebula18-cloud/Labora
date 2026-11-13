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

import AppIcon from "../../../components/AppIcon";
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
          <AppIcon name="chevron-left" size={16} color="#2563eb" />
          <Text style={styles.backText}>Kembali</Text>
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
          <Text style={styles.addButtonText}>+ Tambah Kelas</Text>
        </Pressable>

        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#2563eb" />
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
            <View style={styles.emptyIconCircle}>
              <AppIcon name="class" size={26} color="#475569" />
            </View>
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
  safe: { flex: 1, backgroundColor: "#f1f5f9" },
  content: { padding: 16, paddingBottom: 32 },

  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 12,
  },
  backText: { fontSize: 15, color: "#2563eb", fontWeight: "700" },

  headerRow: { flexDirection: "row", alignItems: "flex-start" },
  headerInfo: { flex: 1 },
  title: { fontSize: 21, fontWeight: "800", color: "#0f172a" },
  subtitle: {
    fontSize: 13,
    color: "#64748b",
    lineHeight: 19,
    marginTop: 4,
  },

  addButton: {
    backgroundColor: "#2563eb",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 16,
    marginBottom: 16,
  },
  addButtonText: { color: "#fff", fontSize: 14.5, fontWeight: "700" },
  pressed: { opacity: 0.85 },

  loadingBox: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 10,
  },
  loadingText: { fontSize: 13, color: "#64748b" },

  errorBox: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  errorBoxText: { color: "#991b1b", fontSize: 13 },

  empty: {
    alignItems: "center",
    paddingVertical: 44,
    paddingHorizontal: 24,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 19,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  kodePill: {
    backgroundColor: "#eff6ff",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  kodePillText: { fontSize: 12, fontWeight: "700", color: "#2563eb" },
  chevron: { fontSize: 22, color: "#94a3b8" },
  course: { fontSize: 15.5, fontWeight: "800", color: "#0f172a" },
  meta: { fontSize: 12, color: "#64748b", marginTop: 4 },
});
