import { CATEGORIES, DEFAULT_GOAL_COUNT, FREQUENCIES, WATER_GOAL_OPTIONS } from '@/lib/shared/constants';
import { isValidDateStr, WEEKDAYS } from '@/lib/shared/dates';
import type { Category, Frequency, Gender, HabitGoal, HabitInput } from '@/lib/shared/types';
import { ApiError } from './http';

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

export function validateEmail(value: unknown): string {
  const email = str(value).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, 'Введите корректный email', 'invalid_email');
  return email;
}

export function validatePassword(value: unknown): string {
  const password = typeof value === 'string' ? value : '';
  if (password.length < 8 || /\s/.test(password)) {
    throw new ApiError(400, 'Пароль: минимум 8 символов, без пробелов', 'invalid_password');
  }
  return password;
}

export function validateName(value: unknown): string {
  const name = str(value);
  if (!name) throw new ApiError(400, 'Введите имя', 'invalid_name');
  if (name.length > 60) throw new ApiError(400, 'Имя слишком длинное', 'invalid_name');
  return name;
}

export function validateGender(value: unknown): Gender {
  return value === 'Мужской' || value === 'Женский' ? value : '';
}

export function validateWaterGoal(value: unknown): number {
  const n = Number(value);
  if (!WATER_GOAL_OPTIONS.includes(n)) throw new ApiError(400, 'Недопустимая цель по воде', 'invalid_goal');
  return n;
}

export function validateAvatar(value: unknown): string | null {
  if (value === null) return null;
  // Only raster images the app itself produces (JPEG/PNG/WebP), strictly base64 — no SVG, nothing that could break out of CSS url().
  if (typeof value !== 'string' || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(value)) {
    throw new ApiError(400, 'Некорректное изображение', 'invalid_avatar');
  }
  if (value.length > 400_000) throw new ApiError(413, 'Фото слишком большое', 'avatar_too_large');
  return value;
}

function validateGoal(value: unknown): HabitGoal | null {
  if (!value || typeof value !== 'object') return null;
  const g = value as Record<string, unknown>;
  const title = str(g.title);
  if (!title) return null;
  if (!isValidDateStr(g.deadline)) throw new ApiError(400, 'Укажите срок достижения цели', 'invalid_goal');
  const count = Number(g.targetCount);
  return {
    title,
    description: str(g.description),
    targetCount: Number.isInteger(count) && count >= 1 && count <= 999 ? count : DEFAULT_GOAL_COUNT,
    deadline: g.deadline,
  };
}

/** Validates a full habit (create) or only the provided fields (update). */
export function validateHabitInput(body: unknown, partial: false): HabitInput;
export function validateHabitInput(body: unknown, partial: true): Partial<HabitInput>;
export function validateHabitInput(body: unknown, partial: boolean): Partial<HabitInput> {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const out: Partial<HabitInput> = {};

  if (!partial || 'title' in b) {
    const title = str(b.title);
    if (!title) throw new ApiError(400, 'Введите название привычки', 'invalid_title');
    if (title.length > 80) throw new ApiError(400, 'Название слишком длинное', 'invalid_title');
    out.title = title;
  }
  if (!partial || 'category' in b) {
    out.category = CATEGORIES.includes(b.category as Category) ? (b.category as Category) : 'Здоровье';
  }
  if (!partial || 'frequency' in b) {
    const freqs = FREQUENCIES.map((f) => f.value);
    out.frequency = freqs.includes(b.frequency as Frequency) ? (b.frequency as Frequency) : 'Ежедневно';
  }
  if (!partial || 'days' in b) {
    const days = Array.isArray(b.days) ? b.days.filter((d): d is string => typeof d === 'string') : [];
    out.days = days.filter((d) => (WEEKDAYS as readonly string[]).includes(d) || /^([1-9]|[12]\d|3[01])$/.test(d));
  }
  if (!partial || 'reminderTime' in b) {
    const t = str(b.reminderTime);
    out.reminderTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(t) ? t : '';
  }
  if (!partial || 'goal' in b) {
    out.goal = validateGoal(b.goal);
  }
  return out;
}
