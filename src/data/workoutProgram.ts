import type { WorkoutDayType, WorkoutProgramDay } from '../types/models';

export const DEFAULT_WORKOUT_PROGRAM: Record<WorkoutDayType, WorkoutProgramDay> = {
  push: {
    type: 'push',
    title: 'Push — chest, shoulders, triceps',
    exercises: [
      {
        id: 'barbell-bench-press',
        name: 'Barbell Bench Press',
        sets: 4,
        reps: '6-8',
        form: 'Grip slightly wider than shoulders. Lower the bar to mid-chest, elbows ~45° from body, drive up explosively.',
        order: 1
      },
      {
        id: 'db-shoulder-press',
        name: 'Dumbbell Shoulder Press',
        sets: 3,
        reps: '8-10',
        form: 'Seated or standing, dumbbells at ear height. Press up without arching your lower back.',
        order: 2
      },
      {
        id: 'incline-db-press',
        name: 'Incline Dumbbell Press',
        sets: 3,
        reps: '10-12',
        form: 'Bench at 30-45°. Lower dumbbells to chest level, press up and slightly inward.',
        order: 3
      },
      {
        id: 'db-flyes',
        name: 'Dumbbell Flyes',
        sets: 3,
        reps: '12-15',
        form: 'Flat bench, slight elbow bend. Arc dumbbells down and out like hugging a tree, squeeze chest at top.',
        order: 4
      },
      {
        id: 'lateral-raises',
        name: 'Lateral Raises',
        sets: 3,
        reps: '12-15',
        form: "Slight forward lean. Raise dumbbells to shoulder height leading with the elbows — don't shrug.",
        order: 5
      },
      {
        id: 'overhead-tri-ext',
        name: 'Overhead Triceps Extension (DB)',
        sets: 3,
        reps: '12-15',
        form: 'One dumbbell held with both hands overhead. Lower behind head; elbows stay close to ears.',
        order: 6
      }
    ]
  },
  pull: {
    type: 'pull',
    title: 'Pull — back, biceps',
    exercises: [
      {
        id: 'barbell-deadlift',
        name: 'Barbell Deadlift',
        sets: 3,
        reps: '5',
        form: 'Bar over midfoot, flat back. Hips and chest rise together; bar stays close to the legs.',
        order: 1
      },
      {
        id: 'barbell-row',
        name: 'Barbell Bent-Over Row',
        sets: 4,
        reps: '6-8',
        form: 'Hinge at hips ~45°. Pull the bar to the lower ribs, squeeze shoulder blades, no jerking.',
        order: 2
      },
      {
        id: 'db-row',
        name: 'One-Arm Dumbbell Row',
        sets: 3,
        reps: '8-10 per arm',
        form: 'Knee and hand on bench. Pull dumbbell to hip, keep back flat, elbow close to body.',
        order: 3
      },
      {
        id: 'barbell-curl',
        name: 'Barbell Curl',
        sets: 3,
        reps: '10-12',
        form: 'Elbows pinned to sides. Curl up without swinging; control the lowering.',
        order: 4
      },
      {
        id: 'hammer-curl',
        name: 'Hammer Curl',
        sets: 3,
        reps: '12-15',
        form: 'Neutral grip (palms facing in). Curl straight up — hits forearms too.',
        order: 5
      },
      {
        id: 'db-shrugs',
        name: 'Dumbbell Shrugs',
        sets: 3,
        reps: '15',
        form: "Dumbbells at sides. Shrug straight up, hold 1 sec at top; don't roll shoulders.",
        order: 6
      }
    ]
  },
  legs: {
    type: 'legs',
    title: 'Legs — quads, hamstrings, glutes, calves, core',
    exercises: [
      {
        id: 'barbell-squat',
        name: 'Barbell Back Squat',
        sets: 4,
        reps: '6-8',
        form: 'Bar on upper traps, feet shoulder-width. Sit hips back and down; knees track over toes.',
        order: 1
      },
      {
        id: 'romanian-dl',
        name: 'Romanian Deadlift',
        sets: 3,
        reps: '8-10',
        form: "Slight knee bend. Hinge at hips, bar slides down thighs; feel hamstring stretch, don't round back.",
        order: 2
      },
      {
        id: 'bulgarian-split',
        name: 'Bulgarian Split Squat',
        sets: 3,
        reps: '10 per leg',
        form: 'Rear foot on bench, front leg does the work. Drop straight down; front knee tracks over toes.',
        order: 3
      },
      {
        id: 'db-lunges',
        name: 'Dumbbell Walking Lunges',
        sets: 3,
        reps: '10 per leg',
        form: 'Long step forward, back knee taps the ground. Push through the front heel to stand.',
        order: 4
      },
      {
        id: 'calf-raise',
        name: 'Standing Calf Raise (holding DBs)',
        sets: 4,
        reps: '15-20',
        form: 'Rise onto toes as high as possible, pause, lower slowly for a full stretch.',
        order: 5
      },
      {
        id: 'plank',
        name: 'Plank / Hanging-style Ab Work',
        sets: 3,
        reps: '30-45s',
        form: "Forearms and toes down, straight line head to heels. Brace core; don't let hips sag.",
        order: 6
      }
    ]
  },
  rest: {
    type: 'rest',
    title: 'Rest day 🌿',
    message: "walking, stretching, some light mobility. today your body is building the strength you're going to use tomorrow. eat well, sleep long.",
    exercises: []
  }
};
