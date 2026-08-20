import {
  Footprints,
  Leaf,
  MessageCircle,
  Pill,
  Scale,
  StickyNote,
  Utensils,
} from 'lucide-react'

const CHOICES = [
  {
    value: 'food',
    label: 'Food',
    hint: 'Treat, extra meal, or snack',
    icon: Utensils,
  },
  {
    value: 'med',
    label: 'Medication',
    hint: 'Extra dose or as-needed med',
    icon: Pill,
  },
  {
    value: 'supplement',
    label: 'Supplement',
    hint: 'Extra dose or as-needed supp',
    icon: Leaf,
  },
  {
    value: 'weight',
    label: 'Weight',
    hint: 'Weigh-in on the scale',
    icon: Scale,
  },
  {
    value: 'activity',
    label: 'Activity',
    hint: 'Walk, play, or training',
    icon: Footprints,
  },
  {
    value: 'note',
    label: 'Note',
    hint: 'A title, time, and comment',
    icon: StickyNote,
  },
  {
    value: 'fleamail',
    label: 'Send Fleamail',
    hint: 'Dog to Parent messenger',
    icon: MessageCircle,
  },
]

/** First step after tapping + — pick Food, Med, Supplement, Weight, Activity, Note, or Fleamail. */
export default function LogChoice({ onPick }) {
  return (
    <ul className="space-y-2">
      {CHOICES.map((choice) => {
        const Icon = choice.icon
        return (
          <li key={choice.value}>
            <button
              type="button"
              onClick={() => onPick(choice.value)}
              className="flex min-h-14 w-full items-center gap-3 rounded-2xl bg-[#FBF9F5] px-3 py-3 text-left transition-colors hover:bg-amber-50"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[#F59E0B]">
                <Icon size={22} strokeWidth={2.25} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-800">
                  {choice.label}
                </span>
                <span className="block text-xs text-slate-400">{choice.hint}</span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
