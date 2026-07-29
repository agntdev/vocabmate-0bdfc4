import type { Ctx } from "./bot.js";
import { inlineButton, inlineKeyboard } from "./toolkit/index.js";

export type Flow =
  | { kind: "idle" }
  | { kind: "adding_prompt"; deckId: string }
  | { kind: "adding_translation"; deckId: string; prompt: string }
  | { kind: "adding_example"; deckId: string; prompt: string; translation: string }
  | { kind: "adding_confirm"; deckId: string; prompt: string; translation: string; example?: string }
  | { kind: "importing"; deckId: string }
  | { kind: "review"; queue: string[]; index: number; revealed: boolean; completed: number };

export interface Card {
  id: string;
  deckId: string;
  prompt: string;
  translation: string;
  example?: string;
  interval: number;
  ease: number;
  repetitions: number;
  dueDate: string;
  lapseCount: number;
}

export interface Deck {
  id: string;
  title: string;
  description: string;
  visibility: "private";
  cardIds: string[];
}

export interface VocabData {
  language: string;
  dailyNewLimit: number;
  notificationTime: string;
  reminderCadence: "daily" | "off";
  streakCount: number;
  lastStudyDate?: string;
  sessionsThisWeek: string[];
  decks: Deck[];
  cards: Card[];
  flow: Flow;
}

type StoredSession = { vocab?: VocabData };

export function now(): Date {
  return new Date();
}

export function data(ctx: Ctx): VocabData {
  const stored = ctx.session as StoredSession;
  if (!stored.vocab) {
    stored.vocab = {
      language: "your target language",
      dailyNewLimit: 10,
      notificationTime: "09:00",
      reminderCadence: "daily",
      streakCount: 0,
      sessionsThisWeek: [],
      decks: [],
      cards: [],
      flow: { kind: "idle" },
    };
  }
  return stored.vocab;
}

export function dayKey(date = now()): string {
  return date.toISOString().slice(0, 10);
}

export function makeId(prefix: string, d: VocabData): string {
  return `${prefix}${d.decks.length + d.cards.length + 1}`;
}

export function starterDecks(d: VocabData): Deck[] {
  if (d.decks.length) return d.decks;
  d.decks.push(
    { id: "travel", title: "Travel essentials", description: "Words for getting around with confidence.", visibility: "private", cardIds: [] },
    { id: "daily", title: "Everyday conversations", description: "Useful words for daily life.", visibility: "private", cardIds: [] },
  );
  return d.decks;
}

export function menuBack() {
  return inlineKeyboard([[inlineButton("Back to menu", "menu:main")]]);
}

export function dueCards(d: VocabData): Card[] {
  const time = now().getTime();
  return d.cards.filter((card) => Date.parse(card.dueDate) <= time);
}

export function displayCard(card: Card): string {
  return `Practice this word:\n${card.prompt}`;
}

export function answerKeyboard() {
  return inlineKeyboard([[inlineButton("Show answer", "review:show")], [inlineButton("Pause session", "review:pause")]]);
}

export function ratingKeyboard() {
  return inlineKeyboard([
    [inlineButton("Again", "review:rate:0"), inlineButton("Hard", "review:rate:3")],
    [inlineButton("Good", "review:rate:4"), inlineButton("Easy", "review:rate:5")],
    [inlineButton("Pause session", "review:pause")],
  ]);
}

export function applySm2(card: Card, quality: number): void {
  if (quality < 3) {
    card.repetitions = 0;
    card.interval = 1;
    card.lapseCount += 1;
  } else {
    card.repetitions += 1;
    if (card.repetitions === 1) card.interval = 1;
    else if (card.repetitions === 2) card.interval = 6;
    else card.interval = Math.max(1, Math.round(card.interval * card.ease));
  }
  card.ease = Math.max(1.3, card.ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  const due = now();
  due.setUTCDate(due.getUTCDate() + card.interval);
  card.dueDate = due.toISOString();
}

export function recordCompletedSession(d: VocabData): { streak: number; milestone: boolean } {
  const today = dayKey();
  if (!d.sessionsThisWeek.includes(today)) d.sessionsThisWeek.push(today);
  d.sessionsThisWeek = d.sessionsThisWeek.filter((day) => Date.parse(day) >= now().getTime() - 7 * 86_400_000);
  if (d.lastStudyDate !== today) {
    const yesterday = new Date(now());
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    d.streakCount = d.lastStudyDate === dayKey(yesterday) ? d.streakCount + 1 : 1;
    d.lastStudyDate = today;
  }
  return { streak: d.streakCount, milestone: d.streakCount > 0 && d.streakCount % 7 === 0 };
}

export function handleFlowText(ctx: Ctx, text: string): string | undefined {
  const d = data(ctx);
  const flow = d.flow;
  const cleaned = text.trim();
  if (!cleaned) return "That looks empty. Send the word or phrase you want to learn.";
  if (flow.kind === "adding_prompt") {
    d.flow = { kind: "adding_translation", deckId: flow.deckId, prompt: cleaned };
    return "Great. Now send its translation.";
  }
  if (flow.kind === "adding_translation") {
    d.flow = { kind: "adding_example", deckId: flow.deckId, prompt: flow.prompt, translation: cleaned };
    return "Add an example sentence, or tap Skip example.";
  }
  if (flow.kind === "adding_example") {
    d.flow = { kind: "adding_confirm", deckId: flow.deckId, prompt: flow.prompt, translation: flow.translation, example: cleaned };
    return `Ready to save:\n${flow.prompt} — ${flow.translation}\nExample: ${cleaned}`;
  }
  return undefined;
}
