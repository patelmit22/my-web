import { DEFAULT_WORKOUT_PROGRAM } from '../data/workoutProgram';
import type { AppState } from '../state/appState';
import type { WorkoutDayType, WorkoutExercise, WorkoutSession } from '../types/models';
import { dateFromSessionKey, dayTypeFor, dayTypeLabel, formatTrainDate, sessionKey, shortDayName, weekRange } from '../utils/workoutSchedule';

function esc(value: string | number | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function selectedKey(state: AppState): string {
  return state.trainSelectedDate || sessionKey();
}

function selectedSession(state: AppState): WorkoutSession | undefined {
  const key = selectedKey(state);
  return state.workoutSessions.find(session => session.date === key);
}

function sortedExercises(exercises: WorkoutExercise[]): WorkoutExercise[] {
  return [...exercises].sort((a, b) => a.order - b.order);
}

function renderWeekStrip(state: AppState): string {
  const key = selectedKey(state);
  const today = sessionKey();
  return `<div class="train-week" aria-label="training week">
    ${weekRange(dateFromSessionKey(key)).map(date => {
      const dayKey = sessionKey(date);
      const type = dayTypeFor(date);
      return `<button class="train-day-chip ${dayKey === key ? 'active' : ''} ${dayKey === today ? 'today' : ''}" data-action="train-pick-day" data-date="${dayKey}">
        <span>${shortDayName(date)}</span>
        <strong>${dayTypeLabel(type)}</strong>
        <small>${date.getDate()}</small>
      </button>`;
    }).join('')}
  </div>`;
}

function renderOverview(state: AppState): string {
  const program = state.workoutProgram || DEFAULT_WORKOUT_PROGRAM;
  return `<div class="train-overview-grid">
    ${(['push', 'pull', 'legs', 'rest'] as WorkoutDayType[]).map(type => {
      const day = program[type] || DEFAULT_WORKOUT_PROGRAM[type];
      return `<div class="train-overview-card ${type}">
        <span>${dayTypeLabel(type)}</span>
        <strong>${esc(day.title)}</strong>
        <small>${type === 'rest' ? esc(day.message || '') : `${day.exercises.length} exercises`}</small>
      </div>`;
    }).join('')}
  </div>`;
}

function renderMedia(exercise: WorkoutExercise): string {
  if (exercise.video) {
    return `<video class="train-ex-media" src="${esc(exercise.video)}" controls playsinline preload="metadata"></video>`;
  }
  return `<img class="train-ex-media" src="${esc(exercise.image || '/exercise-placeholder.svg')}" alt="${esc(exercise.name)}" loading="lazy">`;
}

function renderSetLog(state: AppState, exercise: WorkoutExercise, session?: WorkoutSession): string {
  const expanded = Boolean(state.trainExpandedLogs[`${selectedKey(state)}:${exercise.id}`]);
  if (!expanded) return '';
  const rows = session?.logs?.[exercise.id] || [];
  return `<div class="train-log">
    <div class="train-log-head">
      <span>set</span>
      <span>weight</span>
      <span>reps</span>
    </div>
    ${Array.from({ length: exercise.sets }, (_, index) => {
      const set = index + 1;
      const row = rows.find(item => item.set === set);
      return `<div class="train-set-row">
        <span>${set}</span>
        <input data-train-log="true" data-id="${esc(exercise.id)}" data-set="${set}" data-field="weight" inputmode="decimal" type="number" min="0" step="0.5" value="${esc(row?.weight)}" placeholder="lbs">
        <input data-train-log="true" data-id="${esc(exercise.id)}" data-set="${set}" data-field="reps" inputmode="numeric" type="number" min="0" step="1" value="${esc(row?.reps)}" placeholder="reps">
      </div>`;
    }).join('')}
  </div>`;
}

function renderExercise(state: AppState, exercise: WorkoutExercise, session?: WorkoutSession): string {
  const done = Boolean(session?.completed?.[exercise.id]);
  return `<article class="train-exercise-card ${done ? 'done' : ''}">
    <div class="train-done-mark">✓</div>
    ${renderMedia(exercise)}
    <div class="train-ex-body">
      <div class="train-ex-top">
        <div>
          <span class="train-ex-meta">${exercise.sets} sets × ${esc(exercise.reps)}</span>
          <h3>${esc(exercise.name)}</h3>
        </div>
        <button class="train-complete ${done ? 'is-done' : ''}" data-action="train-toggle-complete" data-id="${esc(exercise.id)}">${done ? 'done' : 'check'}</button>
      </div>
      <p>${esc(exercise.form)}</p>
      <button class="train-log-toggle" data-action="train-open-log" data-id="${esc(exercise.id)}">${state.trainExpandedLogs[`${selectedKey(state)}:${exercise.id}`] ? 'hide set log' : 'log sets'}</button>
      ${renderSetLog(state, exercise, session)}
    </div>
  </article>`;
}

export function renderTrainPage(state: AppState): string {
  if (state.currentUser?.role !== 'me') {
    return `<section class="page active"><div class="empty-state">Train is owner-only.</div></section>`;
  }

  const key = selectedKey(state);
  const type = dayTypeFor(dateFromSessionKey(key));
  const program = state.workoutProgram || DEFAULT_WORKOUT_PROGRAM;
  const day = program[type] || DEFAULT_WORKOUT_PROGRAM[type];
  const exercises = sortedExercises(day.exercises || []);
  const session = selectedSession(state);
  const done = exercises.filter(exercise => session?.completed?.[exercise.id]).length;
  const total = exercises.length;
  const percent = total ? Math.round((done / total) * 100) : 100;

  return `<section class="page active train-page" id="page-train">
    <div class="page-header train-head">
      <div>
        <div class="page-title">Train</div>
        <div class="page-sub">push, pull, legs, and rest — logged by day</div>
      </div>
      <button class="btn-ghost" data-action="train-toggle-overview">${state.trainShowOverview ? 'hide overview' : 'show overview'}</button>
    </div>
    ${renderWeekStrip(state)}
    <section class="train-panel">
      <div class="train-panel-top">
        <div>
          <span>${formatTrainDate(key)}</span>
          <h2>${esc(day.title)}</h2>
          ${day.message ? `<p>${esc(day.message)}</p>` : ''}
        </div>
        <div class="train-score">
          <strong>${done}/${total}</strong>
          <span>complete</span>
        </div>
      </div>
      <div class="train-progress-track"><div style="width:${percent}%"></div></div>
      ${state.trainShowOverview ? renderOverview(state) : ''}
      ${type === 'rest'
        ? `<div class="train-rest-card">Rest day. Walk, stretch, eat well, and let the work settle in.</div>`
        : `<div class="train-exercise-grid">${exercises.map(exercise => renderExercise(state, exercise, session)).join('')}</div>`}
      <button class="train-finish" data-action="train-finish-session" ${type === 'rest' ? 'disabled' : ''}>finish session</button>
    </section>
  </section>`;
}
