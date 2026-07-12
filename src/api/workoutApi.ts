import { DEFAULT_WORKOUT_PROGRAM } from '../data/workoutProgram';
import type { WorkoutDayType, WorkoutProgramDay, WorkoutSession } from '../types/models';
import { db } from './firebaseClient';

const PROGRAM_PATH = 'workout/program';
const SESSIONS_PATH = 'workout/sessions';

function cleanUndefined<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeProgram(value: unknown): Record<WorkoutDayType, WorkoutProgramDay> {
  return {
    ...DEFAULT_WORKOUT_PROGRAM,
    ...(value && typeof value === 'object' ? value as Partial<Record<WorkoutDayType, WorkoutProgramDay>> : {})
  };
}

export async function ensureWorkoutProgramSeeded(): Promise<void> {
  const snap = await db.ref(`${PROGRAM_PATH}/push`).get();
  if (!snap.exists()) {
    await db.ref(PROGRAM_PATH).set(cleanUndefined(DEFAULT_WORKOUT_PROGRAM));
  }
}

export function subscribeWorkoutProgram(
  callback: (program: Record<WorkoutDayType, WorkoutProgramDay>) => void,
  onError: (error: Error) => void
): () => void {
  const ref = db.ref(PROGRAM_PATH);
  const handler = ref.on('value', snapshot => callback(normalizeProgram(snapshot.val())), onError);
  return () => ref.off('value', handler);
}

export function subscribeWorkoutSessions(
  callback: (sessions: WorkoutSession[]) => void,
  onError: (error: Error) => void
): () => void {
  const ref = db.ref(SESSIONS_PATH);
  const handler = ref.on('value', snapshot => {
    const raw = snapshot.val() as Record<string, WorkoutSession> | null;
    const sessions = Object.values(raw || {}).sort((a, b) => b.date.localeCompare(a.date));
    callback(sessions);
  }, onError);
  return () => ref.off('value', handler);
}

export function saveWorkoutSession(session: WorkoutSession): Promise<void> {
  return db.ref(`${SESSIONS_PATH}/${session.date}`).set(cleanUndefined(session));
}
