const SITE_URL = window.location.origin;

export interface ShareData {
  title: string;
  text: string;
  url: string;
  hashtags?: string[];
}

/**
 * Build a profile deep link URL
 */
export function profileUrl(userId: string): string {
  return `${SITE_URL}/organizacion/${userId}`;
}

/**
 * Create share data for a badge achievement
 */
export function badgeShareData(
  badgeName: string,
  badgeIcon: string,
  userName: string,
  userId: string
): ShareData {
  return {
    title: `${badgeIcon} ¡He ganado la medalla "${badgeName}" en TinkuyHub!`,
    text: `${badgeIcon} ¡${userName} desbloqueó la medalla "${badgeName}" haciendo voluntariado en TinkuyHub! Únete y transforma tu comunidad 🌍`,
    url: profileUrl(userId),
    hashtags: ["TinkuyHub", "Voluntariado", "ImpactoSocial"],
  };
}

/**
 * Create share data for completed events milestone
 */
export function eventsShareData(
  count: number,
  userName: string,
  userId: string
): ShareData {
  return {
    title: `🎉 ¡${count} eventos de voluntariado completados!`,
    text: `🎉 ${userName} ya completó ${count} evento${count > 1 ? "s" : ""} de voluntariado en TinkuyHub. ¡Cada acción cuenta! Únete tú también 🌱`,
    url: profileUrl(userId),
    hashtags: ["TinkuyHub", "Voluntariado", "ComunidadActiva"],
  };
}

/**
 * Create share data for accumulated hours
 */
export function hoursShareData(
  hours: number,
  userName: string,
  userId: string
): ShareData {
  return {
    title: `⏱️ ¡${hours} horas de voluntariado!`,
    text: `⏱️ ${userName} lleva ${hours} horas transformando su comunidad con TinkuyHub. ¿Te sumas? 💪🌍`,
    url: profileUrl(userId),
    hashtags: ["TinkuyHub", "HorasVoluntariado", "ImpactoReal"],
  };
}

// ──────────────── Social Network URL Builders ────────────────

export function whatsappUrl(data: ShareData): string {
  const msg = `${data.text}\n\n${data.url}`;
  return `https://wa.me/?text=${encodeURIComponent(msg)}`;
}

export function twitterUrl(data: ShareData): string {
  const tags = data.hashtags?.map((t) => `#${t}`).join(" ") ?? "";
  const tweet = `${data.text} ${tags}`;
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}&url=${encodeURIComponent(data.url)}`;
}

export function facebookUrl(data: ShareData): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(data.url)}&quote=${encodeURIComponent(data.text)}`;
}

export function linkedinUrl(data: ShareData): string {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(data.url)}`;
}

export function telegramUrl(data: ShareData): string {
  return `https://t.me/share/url?url=${encodeURIComponent(data.url)}&text=${encodeURIComponent(data.text)}`;
}

/**
 * Use Web Share API (mobile native) or fall back to clipboard
 */
export async function nativeShare(data: ShareData): Promise<boolean> {
  if (navigator.share) {
    try {
      await navigator.share({ title: data.title, text: data.text, url: data.url });
      return true;
    } catch {
      return false; // user cancelled
    }
  }
  return false;
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(data: ShareData): Promise<void> {
  const text = `${data.text}\n${data.url}`;
  await navigator.clipboard.writeText(text);
}
