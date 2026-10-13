import { base44 } from '@/api/base44Client';

export async function loadAssignableMitarbeiter() {
  try {
    const all = await base44.entities.Mitarbeiter.list('-name', 100);
    return all.filter(m => m.status !== 'Inaktiv' && m.linked_email);
  } catch (e) {
    return [];
  }
}

export function isAssignedToMe(task, userEmail) {
  return !!(task.zugewiesen_an_email && task.zugewiesen_an_email === userEmail);
}

export function isDelegatedByMe(task, userId, userEmail) {
  return task.created_by_id === userId && !!task.zugewiesen_an_email && task.zugewiesen_an_email !== userEmail;
}

export function filterByDelegation(aufgaben, filter, user) {
  if (!user) return aufgaben;
  if (filter === 'mine') return aufgaben.filter(t => isAssignedToMe(t, user.email));
  if (filter === 'byme') return aufgaben.filter(t => isDelegatedByMe(t, user.id, user.email));
  return aufgaben;
}