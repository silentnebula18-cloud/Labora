import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "@react-native-firebase/firestore";

import { db } from "../lib/firebase";
import {
  isRole,
  type ClassMember,
  type ClassRecord,
  type Role,
} from "../types";

export interface ClassInput {
  mataKuliah: string;
  kodeKelas: string;
}

export interface UserLookup {
  uid: string;
  nama: string;
  nim: string;
  email: string;
  roles: Role[];
}

type Listener<T> = (items: T) => void;
type ErrorListener = (error: unknown) => void;

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readStringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function toDate(value: unknown): Date | null {
  if (value && typeof (value as { toDate?: unknown }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate();
  }
  return null;
}

function mapClass(id: string, data: Record<string, unknown>): ClassRecord {
  return {
    id,
    mataKuliah: readString(data.mataKuliah),
    kodeKelas: readString(data.kodeKelas),
    assistants: readStringList(data.assistants),
    createdBy: readString(data.createdBy),
    createdAt: toDate(data.createdAt),
  };
}

function mapMember(id: string, data: Record<string, unknown>): ClassMember {
  return {
    uid: readString(data.uid) || id,
    nama: readString(data.nama),
    nim: readString(data.nim),
    email: readString(data.email),
    joinedAt: toDate(data.joinedAt),
  };
}

function sortClasses(items: ClassRecord[]): ClassRecord[] {
  return items.sort((a, b) => {
    const timeA = a.createdAt?.getTime() ?? 0;
    const timeB = b.createdAt?.getTime() ?? 0;
    if (timeA !== timeB) return timeB - timeA;
    return a.mataKuliah.localeCompare(b.mataKuliah);
  });
}

export function describeFirestoreError(error: unknown): string {
  const code =
    typeof (error as { code?: unknown })?.code === "string"
      ? (error as { code: string }).code
      : "";

  if (code.includes("permission-denied")) {
    return "Anda tidak memiliki akses untuk mengubah data ini.";
  }
  if (
    code.includes("unavailable") ||
    code.includes("network-request-failed") ||
    code.includes("failed-precondition")
  ) {
    return "Koneksi ke database bermasalah. Periksa jaringan Anda.";
  }
  if (code.includes("not-found")) {
    return "Data tidak ditemukan.";
  }
  if (code.includes("already-exists")) {
    return "Data tersebut sudah ada.";
  }
  return "Terjadi kesalahan saat menyimpan data.";
}

// ─── Kelas ────────────────────────────────────────────────────────────────────

/** Kelas yang diasistensi pengguna (filter server-side). */
export function subscribeAssistantClasses(
  uid: string,
  onData: Listener<ClassRecord[]>,
  onError?: ErrorListener,
) {
  const classesQuery = query(
    collection(db, "classes"),
    where("assistants", "array-contains", uid),
  );

  return onSnapshot(
    classesQuery,
    (snapshot) => {
      onData(sortClasses(snapshot.docs.map((d) => mapClass(d.id, d.data()))));
    },
    (error) => onError?.(error),
  );
}

/**
 * Kelas yang diikuti praktikan.
 * Mencakup kelas dengan `kodeKelas == userKelas` (misal "A1") serta kelas di mana `memberIds` memuat `uid`.
 */
export function subscribeStudentClasses(
  uid: string,
  onData: Listener<ClassRecord[]>,
  onError?: ErrorListener,
  userKelas?: string,
) {
  const byMemberMap = new Map<string, ClassRecord>();
  const byKodeMap = new Map<string, ClassRecord>();

  function emitMerged() {
    const merged = new Map<string, ClassRecord>();
    byMemberMap.forEach((val, key) => merged.set(key, val));
    byKodeMap.forEach((val, key) => merged.set(key, val));
    onData(sortClasses(Array.from(merged.values())));
  }

  const memberQuery = query(
    collection(db, "classes"),
    where("memberIds", "array-contains", uid),
  );

  const unsubMember = onSnapshot(
    memberQuery,
    (snapshot) => {
      byMemberMap.clear();
      snapshot.docs.forEach((d) => {
        byMemberMap.set(d.id, mapClass(d.id, d.data()));
      });
      emitMerged();
    },
    (error) => onError?.(error),
  );

  const normalizedKelas = userKelas?.trim().toUpperCase();
  let unsubKode: (() => void) | null = null;

  if (normalizedKelas) {
    const kodeQuery = query(
      collection(db, "classes"),
      where("kodeKelas", "==", normalizedKelas),
    );
    unsubKode = onSnapshot(
      kodeQuery,
      (snapshot) => {
        byKodeMap.clear();
        snapshot.docs.forEach((d) => {
          byKodeMap.set(d.id, mapClass(d.id, d.data()));
        });
        emitMerged();
      },
      (error) => onError?.(error),
    );
  }

  return () => {
    unsubMember();
    unsubKode?.();
  };
}

export function subscribeClass(
  classId: string,
  onData: (item: ClassRecord | null) => void,
  onError?: ErrorListener,
) {
  return onSnapshot(
    doc(db, "classes", classId),
    (snapshot) => {
      onData(
        snapshot.exists()
          ? mapClass(snapshot.id, snapshot.data() as Record<string, unknown>)
          : null,
      );
    },
    (error) => onError?.(error),
  );
}

export async function createClass(
  uid: string,
  input: ClassInput,
): Promise<string> {
  const reference = await addDoc(collection(db, "classes"), {
    mataKuliah: input.mataKuliah.trim(),
    kodeKelas: input.kodeKelas.trim().toUpperCase(),
    assistants: [uid],
    createdBy: uid,
    memberIds: [],
    createdAt: serverTimestamp(),
  });

  return reference.id;
}

export async function updateClassInfo(
  classId: string,
  input: ClassInput,
): Promise<void> {
  await updateDoc(doc(db, "classes", classId), {
    mataKuliah: input.mataKuliah.trim(),
    kodeKelas: input.kodeKelas.trim().toUpperCase(),
  });
}

/** Hapus kelas beserta seluruh dokumen anggota di subcollection. */
export async function deleteClass(classId: string): Promise<void> {
  const membersSnapshot = await getDocs(
    collection(db, "classes", classId, "members"),
  );

  const batch = writeBatch(db);
  membersSnapshot.docs.forEach((memberDoc) => batch.delete(memberDoc.ref));
  batch.delete(doc(db, "classes", classId));
  await batch.commit();
}

// ─── Peserta ──────────────────────────────────────────────────────────────────

export function subscribeClassMembers(
  classId: string,
  onData: Listener<ClassMember[]>,
  onError?: ErrorListener,
  kodeKelas?: string,
) {
  const subcollectionMap = new Map<string, ClassMember>();
  const registeredByKelasMap = new Map<string, ClassMember>();

  function emitMerged() {
    const merged = new Map<string, ClassMember>();
    registeredByKelasMap.forEach((val, key) => merged.set(key, val));
    subcollectionMap.forEach((val, key) => merged.set(key, val));
    onData(
      Array.from(merged.values()).sort((a, b) => a.nama.localeCompare(b.nama)),
    );
  }

  const unsubMembers = onSnapshot(
    collection(db, "classes", classId, "members"),
    (snapshot) => {
      subcollectionMap.clear();
      snapshot.docs.forEach((d) => {
        const m = mapMember(d.id, d.data());
        subcollectionMap.set(m.uid, m);
      });
      emitMerged();
    },
    (error) => onError?.(error),
  );

  const normalizedKelas = kodeKelas?.trim().toUpperCase();
  let unsubUsers: (() => void) | null = null;

  if (normalizedKelas) {
    const usersQuery = query(
      collection(db, "users"),
      where("kelas", "==", normalizedKelas),
    );
    unsubUsers = onSnapshot(
      usersQuery,
      (snapshot) => {
        registeredByKelasMap.clear();
        snapshot.docs.forEach((d) => {
          const data = d.data() as Record<string, unknown>;
          const roles = Array.isArray(data.roles)
            ? data.roles.filter(isRole)
            : [];
          if (!roles.includes("praktikan")) return;
          const uid = readString(data.uid) || d.id;
          registeredByKelasMap.set(uid, {
            uid,
            nama: readString(data.nama),
            nim: readString(data.nim),
            email: readString(data.email),
            joinedAt: toDate(data.createdAt),
          });
        });
        emitMerged();
      },
      () => {
        // Abaikan jika query users terkendala izin pada akun non-asisten
      },
    );
  }

  return () => {
    unsubMembers();
    unsubUsers?.();
  };
}

export async function findUserByEmail(
  email: string,
): Promise<UserLookup | null> {
  const normalized = email.trim().toLowerCase();
  const usersQuery = query(
    collection(db, "users"),
    where("email", "==", normalized),
    limit(1),
  );
  const snapshot = await getDocs(usersQuery);

  if (snapshot.empty) return null;

  const userDoc = snapshot.docs[0];
  const data = userDoc.data() as Record<string, unknown>;
  const roles = Array.isArray(data.roles)
    ? data.roles.filter(isRole)
    : [];

  return {
    uid: userDoc.id,
    nama: readString(data.nama),
    nim: readString(data.nim),
    email: readString(data.email),
    roles,
  };
}

export async function addClassMember(
  classId: string,
  user: UserLookup,
): Promise<void> {
  const batch = writeBatch(db);
  batch.set(doc(db, "classes", classId, "members", user.uid), {
    uid: user.uid,
    nama: user.nama,
    nim: user.nim,
    email: user.email,
    joinedAt: serverTimestamp(),
  });
  batch.update(doc(db, "classes", classId), {
    memberIds: arrayUnion(user.uid),
  });
  await batch.commit();
}

export async function removeClassMember(
  classId: string,
  uid: string,
): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, "classes", classId, "members", uid));
  batch.update(doc(db, "classes", classId), {
    memberIds: arrayRemove(uid),
  });
  await batch.commit();
}
