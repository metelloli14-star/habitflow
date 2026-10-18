import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/server/http';
import { validateAvatar, validateEmail, validateHabitInput, validateName, validatePassword, validateWaterGoal } from '@/lib/server/validation';
import { TINY_JPEG } from '../fixtures';

const code = (fn: () => unknown) => {
  try {
    fn();
  } catch (err) {
    return err instanceof ApiError ? err.code : 'not-api-error';
  }
  return 'no-error';
};

describe('account fields', () => {
  it('normalises email to lower case and rejects malformed ones', () => {
    expect(validateEmail('  Olga@Example.RU ')).toBe('olga@example.ru');
    expect(code(() => validateEmail('olga@'))).toBe('invalid_email');
  });

  it('password: at least 8 characters, no spaces', () => {
    expect(validatePassword('secret123')).toBe('secret123');
    expect(code(() => validatePassword('short'))).toBe('invalid_password');
    expect(code(() => validatePassword('with space 123'))).toBe('invalid_password');
  });

  it('name is required and limited', () => {
    expect(validateName('  Ольга ')).toBe('Ольга');
    expect(code(() => validateName(''))).toBe('invalid_name');
    expect(code(() => validateName('я'.repeat(61)))).toBe('invalid_name');
  });

  it('water goal is one of the offered options', () => {
    expect(validateWaterGoal(2500)).toBe(2500);
    expect(code(() => validateWaterGoal(1234))).toBe('invalid_goal');
  });

  it('photo: only base64 JPEG/PNG/WebP data URLs, not too large', () => {
    expect(validateAvatar(TINY_JPEG)).toBe(TINY_JPEG);
    expect(validateAvatar(null)).toBeNull();
    expect(code(() => validateAvatar('data:image/svg+xml;base64,PHN2Zz4='))).toBe('invalid_avatar');
    expect(code(() => validateAvatar('https://example.com/a.jpg'))).toBe('invalid_avatar');
    expect(code(() => validateAvatar(`data:image/jpeg;base64,${'A'.repeat(400_000)}`))).toBe('avatar_too_large');
  });
});

describe('habit form', () => {
  const valid = { title: 'Зарядка', category: 'Здоровье', frequency: 'Еженедельно', days: ['Пн', 'Ср', 'XX'], reminderTime: '08:00', goal: null };

  it('keeps valid fields and drops unknown weekdays', () => {
    const habit = validateHabitInput(valid, false);
    expect(habit).toMatchObject({ title: 'Зарядка', category: 'Здоровье', frequency: 'Еженедельно', days: ['Пн', 'Ср'], reminderTime: '08:00' });
  });

  it('ignores a malformed reminder time', () => {
    expect(validateHabitInput({ ...valid, reminderTime: '25:99' }, false).reminderTime).toBe('');
  });

  it('a partial update only touches the given fields', () => {
    expect(validateHabitInput({ title: 'Бег' }, true)).toEqual({ title: 'Бег' });
  });
});
