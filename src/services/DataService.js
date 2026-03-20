// DataService.js — all storage operations go through here.
// To migrate to a real backend: replace each function body only.

const KEYS = {
  USERS: "st2:users",
  CURRENT_USER: "st2:current-user",
  SPRINTS: "st2:sprints",
};

// ─── helpers ──────────────────────────────────────────────────────────────

function read(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

// ─── password hashing ─────────────────────────────────────────────────────

export async function hashPassword(password) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(password)
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ─── users ────────────────────────────────────────────────────────────────

export function getUsers() {
  return read(KEYS.USERS) || [];
}

export function getUserById(id) {
  return getUsers().find((u) => u.id === id) || null;
}

export function getUserByEmail(email) {
  return getUsers().find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
}

export async function createUser({ name, email, password }) {
  const users = getUsers();
  if (getUserByEmail(email)) throw new Error("EMAIL_EXISTS");
  const user = {
    id: `usr_${Date.now()}`,
    name,
    email: email.toLowerCase(),
    passwordHash: await hashPassword(password),
    createdAt: new Date().toISOString(),
  };
  write(KEYS.USERS, [...users, user]);
  return user;
}

export async function verifyUser({ email, password }) {
  const user = getUserByEmail(email);
  if (!user) throw new Error("INVALID_CREDENTIALS");
  const hash = await hashPassword(password);
  if (hash !== user.passwordHash) throw new Error("INVALID_CREDENTIALS");
  return user;
}

// ─── session ──────────────────────────────────────────────────────────────

export function getCurrentUserId() {
  return read(KEYS.CURRENT_USER);
}

export function setCurrentUser(userId) {
  write(KEYS.CURRENT_USER, userId);
}

export function clearCurrentUser() {
  localStorage.removeItem(KEYS.CURRENT_USER);
}

// ─── sprints ──────────────────────────────────────────────────────────────

export function getAllSprints() {
  return read(KEYS.SPRINTS) || [];
}

export function getSprintsForUser(userId) {
  return getAllSprints().filter((s) => s.userId === userId);
}

export function getSprintById(id) {
  return getAllSprints().find((s) => s.id === id) || null;
}

export function saveSprint(sprint) {
  const sprints = getAllSprints();
  const idx = sprints.findIndex((s) => s.id === sprint.id);
  if (idx >= 0) {
    sprints[idx] = sprint;
  } else {
    sprints.push(sprint);
  }
  write(KEYS.SPRINTS, sprints);
  return sprint;
}

export function deleteSprint(id) {
  write(KEYS.SPRINTS, getAllSprints().filter((s) => s.id !== id));
}

export function updateSprintChecked(sprintId, checked) {
  const sprint = getSprintById(sprintId);
  if (!sprint) return;
  saveSprint({ ...sprint, checked });
}

export function updateSprintStartDate(sprintId, startDate) {
  const sprint = getSprintById(sprintId);
  if (!sprint) return;
  saveSprint({ ...sprint, startDate });
}
