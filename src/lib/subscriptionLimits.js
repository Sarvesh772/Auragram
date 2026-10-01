export const FREE_BIO_LIMIT = 90;
export const PREMIUM_BIO_LIMIT = 150;
export const FREE_BIO_LINK_LIMIT = 2;
export const PREMIUM_BIO_LINK_LIMIT = 5;
export const FREE_CAPTION_LIMIT = 500;
export const PREMIUM_CAPTION_LIMIT = 1500;

export function isPremiumActive(profile) {
  return Boolean(profile?.is_verified && (!profile.verified_until || new Date(profile.verified_until) > new Date()));
}

export function countLinks(text = '') {
  return (text.match(/(?:https?:\/\/|www\.)[^\s]+/gi) || []).length;
}
