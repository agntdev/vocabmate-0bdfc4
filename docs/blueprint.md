# VocabSprint — Bot specification

**Archetype:** education

**Voice:** professional and encouraging — write every user-facing message, button label, error, and empty state in this voice.

A private Telegram bot for language learners to build vocabulary using spaced repetition (SM-2 algorithm). Users create/import word pairs, review cards with recall ratings, and track progress through scheduled reviews and streaks.

> This is the complete contract for the bot. Implement EVERY entry point, flow, feature, integration, and edge case below. The completeness review checks the bot against this document after each build pass.

## Primary audience

- language learners
- students
- self-learners

## Success criteria

- User completes 3+ review sessions per week
- Cards are scheduled according to SM-2 algorithm
- Users retain 70%+ of studied vocabulary over 30 days

## Entry points

Every feature must be reachable from the bot's command/button surface (button-first; only /start and /help are slash commands).

- **/start** (command, actor: user, command: /start) — Open main menu with tutorial and quick actions
- **/add** (command, actor: user, command: /add) — Begin creating a new card in selected deck
- **/decks** (command, actor: user, command: /decks) — Browse and manage decks/cards
- **/settings** (command, actor: user, command: /settings) — Configure daily limits, reminders, and review preferences
- **/review** (command, actor: user, command: /review) — Start a scheduled review session
- **/stats** (command, actor: user, command: /stats) — View learning progress and streaks
- **Review due cards** (button, actor: user, callback: review:resume) — Quick action button in notifications to resume interrupted sessions

## Flows

### onboarding
_Trigger:_ /start

1. Show tutorial
2. Offer starter decks
3. Set initial settings

_Data touched:_ User, Deck

### card_creation
_Trigger:_ /add

1. Select deck
2. Enter prompt
3. Enter translation
4. Add example (optional)
5. Confirm card

_Data touched:_ Card, Deck

### review_session
_Trigger:_ /review

1. Show prompt
2. Reveal answer
3. Collect rating
4. Update SM-2 fields
5. Schedule next review
6. Save session state

_Data touched:_ Card, Session

### daily_reminder
_Trigger:_ scheduled notification

1. Count due cards
2. Send reminder with quick action button
3. Track user response

_Data touched:_ User, Session

## Data entities

Durable data (must survive a restart) uses the toolkit's persistent store, never in-memory maps.

- **User** _(retention: persistent)_ — User account and preferences
  - fields: telegram_id, language, daily_new_limit, notification_time, streak_count
- **Deck** _(retention: persistent)_ — Card collection with metadata
  - fields: title, description, visibility, card_count
- **Card** _(retention: persistent)_ — Individual vocabulary item with SM-2 scheduling
  - fields: prompt, translation, example, interval, ease, repetitions, due_date, lapse_count
- **Session** _(retention: session)_ — Active review session state
  - fields: current_card_index, paused_at, review_queue
- **Settings** _(retention: persistent)_ — User-specific configuration
  - fields: new_card_limit, notification_window, review_reminder_cadence

## Integrations

- **Telegram** (required) — Bot API messaging and notifications
Call external APIs against their real contract (correct endpoints, ids, params); credentials from env. Do not fake responses.

## Owner controls

- Enable/disable sharing (currently disabled)
- Add premium features (deferred)

## Notifications

- Daily review reminders
- Session completion summaries
- Streak milestones

## Permissions & privacy

- All data private to user
- No sharing/export by default
- No third-party access

## Edge cases

- Empty deck -> suggest adding cards
- Interrupted session -> auto-resume
- No due cards -> show learning status

## Required tests

- End-to-end review session with SM-2 rating flow
- Session resumption after interruption
- Daily notification delivery with quick action

## Assumptions

- Users want default 10 new cards/day
- Starter decks are pre-configured
- SM-2 algorithm uses standard Anki parameters
