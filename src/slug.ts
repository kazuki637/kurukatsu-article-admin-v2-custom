
import slugify from 'slugify';
import { toRomaji } from 'wanakana';

export function toSlug(input: string): string {
  if (!input) return '';
  const romaji = toRomaji(input);
  return slugify(romaji, { lower: true, strict: true, trim: true });
}
