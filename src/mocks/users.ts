import type { User } from "../types";

export const users: User[] = [
  {
    id: "U001",
    nim: "198001",
    nama: "Andi Pratama",
    password: "asisten123",
    roles: ["asisten"],
  },
  {
    id: "U002",
    nim: "198002",
    nama: "Siti Rahma",
    password: "asisten456",
    roles: ["asisten"],
  },
  {
    id: "U003",
    nim: "240001",
    nama: "Budi Santoso",
    password: "praktikan123",
    roles: ["praktikan"],
  },
  {
    id: "U004",
    nim: "240002",
    nama: "Dewi Anggraini",
    password: "praktikan456",
    roles: ["praktikan"],
  },
  {
    id: "U005",
    nim: "240003",
    nama: "Rizky Firmansyah",
    password: "praktikan789",
    roles: ["praktikan"],
  },
  {
    id: "U006",
    nim: "240004",
    nama: "Nadia Putri",
    password: "praktikan321",
    roles: ["praktikan"],
  },
  {
    id: "U007",
    nim: "240005",
    nama: "Fajar Ramadhan",
    password: "praktikan654",
    roles: ["praktikan"],
  },
  {
    id: "U008",
    nim: "198003",
    nama: "Citra Lestari",
    password: "gabungan123",
    roles: ["praktikan", "asisten"],
  },
];
