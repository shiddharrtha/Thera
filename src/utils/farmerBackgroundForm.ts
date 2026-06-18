import {
  CROP_OPTIONS,
  resolveChipSelection,
  resolveChipValue,
  type CropOption,
} from '../constants/farmFormOptions';
import type { FarmRoleOption } from '../constants/farmerBackgroundOptions';
import type { FarmerBackground } from '../types/models';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseBirthdayInput(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (ISO_DATE_RE.test(trimmed)) {
    const [year, month, day] = trimmed.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    if (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    ) {
      return date;
    }
    return null;
  }

  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const month = Number(slashMatch[1]);
    const day = Number(slashMatch[2]);
    const year = Number(slashMatch[3]);
    const date = new Date(year, month - 1, day);
    if (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    ) {
      return date;
    }
  }

  return null;
}

export function formatBirthdayIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calculateAgeFromBirthday(birthday: string): number | null {
  const date = parseBirthdayInput(birthday);
  if (!date) return null;

  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

export function resolveMainCropSelection(
  crop?: string,
  fallback: CropOption = 'Soybean',
): { selection: CropOption; other: string } {
  return resolveChipSelection(CROP_OPTIONS, crop, fallback);
}

export function validateFarmerBackgroundInput(input: {
  yearsFarming: string;
  birthday: string;
  age: string;
  fieldCount: string;
  cropSelection: CropOption;
  otherCropType: string;
  pesticideBrand: string;
  farmRole: FarmRoleOption;
  otherRole: string;
  primaryGoals: string[];
}): { ok: true; value: FarmerBackground } | { ok: false; message: string } {
  const years = Number(input.yearsFarming.trim());
  if (!input.yearsFarming.trim() || !Number.isFinite(years) || years < 0) {
    return { ok: false, message: 'Please enter how many years you have been farming.' };
  }
  if (years > 100) {
    return { ok: false, message: 'Please enter a realistic number of years farming.' };
  }

  const birthdayDate = parseBirthdayInput(input.birthday);
  if (!birthdayDate) {
    return { ok: false, message: 'Please enter a valid birthday (YYYY-MM-DD or MM/DD/YYYY).' };
  }
  if (birthdayDate > new Date()) {
    return { ok: false, message: 'Birthday cannot be in the future.' };
  }

  const age = Number(input.age.trim());
  if (!input.age.trim() || !Number.isFinite(age) || age < 16 || age > 120) {
    return { ok: false, message: 'Please enter your age (16–120).' };
  }

  const computedAge = calculateAgeFromBirthday(formatBirthdayIso(birthdayDate));
  if (computedAge !== null && Math.abs(computedAge - age) > 1) {
    return { ok: false, message: 'Age does not match the birthday you entered.' };
  }

  const fields = Number(input.fieldCount.trim());
  if (!input.fieldCount.trim() || !Number.isFinite(fields) || fields < 0 || !Number.isInteger(fields)) {
    return { ok: false, message: 'Please enter how many fields you manage (whole number).' };
  }
  if (fields > 10_000) {
    return { ok: false, message: 'Please enter a realistic number of fields.' };
  }

  const mainCrop = resolveChipValue(input.cropSelection, input.otherCropType);
  if (input.cropSelection === 'Other' && !mainCrop) {
    return { ok: false, message: 'Please enter your main crop.' };
  }

  const pesticideBrand = input.pesticideBrand.trim();
  if (!pesticideBrand) {
    return { ok: false, message: 'Please enter the brand of pesticide you use.' };
  }
  if (pesticideBrand.length > 120) {
    return { ok: false, message: 'Pesticide brand name is too long.' };
  }

  const resolvedRole =
    input.farmRole === 'Other' ? input.otherRole.trim() : input.farmRole;
  if (input.farmRole === 'Other' && !resolvedRole) {
    return { ok: false, message: 'Please describe your role on the farm.' };
  }

  if (input.primaryGoals.length === 0) {
    return { ok: false, message: 'Select at least one goal for using Thera.' };
  }

  return {
    ok: true,
    value: {
      yearsFarming: String(Math.round(years)),
      birthday: formatBirthdayIso(birthdayDate),
      age: String(Math.round(age)),
      fieldCount: String(fields),
      mainCrop,
      pesticideBrand,
      farmRole: resolvedRole,
      primaryGoals: input.primaryGoals,
    },
  };
}
