# Mandali App Feature Inventory

Last reviewed from the local codebase on 2026-07-16.

This document summarizes what Mandali does, the use cases it solves, and the major and minor product behaviors currently represented in the mobile app and backend.

## 1. Product Summary

Mandali is a private group companion app for close circles such as families, friends, travel groups, social clubs, and recurring friend groups. It combines:

- Private group creation and invite-based membership.
- Shared memories and photo stories.
- Event and plan coordination.
- RSVP and live plan hubs.
- Plan hype features before a meetup.
- Bring-list coordination for who brings what.
- Shared expense tracking through Hisaab.
- Real-time social games, currently Housie and Blink.
- Group activity scoring through Group Pulse.
- Notifications, deep links, app links, safety tools, and legal/support pages.

The core use case is: a real-life group wants one private place to plan meetups, preserve moments, split money, play games, and keep the group active over time.

## 2. Main Problems Solved

### Private Group Coordination

Mandali lets users create a private circle, invite people using an invite code/link, and keep that group’s activity separate from every other Mandali.

Use cases solved:

- Create a private family/friend group.
- Share a simple invite link.
- Join using an 8-character invite code.
- See who is in the group.
- Transfer group ownership.
- Leave a group.
- Delete a group if the user is the admin.
- Update group name, description, and cover photo.
- Track member count, creation year, and role.

### Social Memory Archive

Mandali acts as a shared digital scrapbook for each group.

Use cases solved:

- Upload one or multiple photos as a memory.
- Add a story/caption.
- Attach memories to a group or to a specific plan.
- Browse memories by group.
- View memories in a grid.
- Open a memory detail view.
- Pinch/zoom images.
- Comment on memories.
- React to memories.
- Delete one’s own memories/comments.
- See reaction summaries.
- See comment counts.
- Hide blocked/reported users’ content.
- Surface “On This Day” style nostalgic memories in the frontend components.
- Track unseen memories per group and show a tab badge.

### Event Planning

Mandali includes a plan system for meetups and shared activities.

Use cases solved:

- Create a plan for a Mandali.
- Select or create a plan activity.
- Use activity suggestions and icons.
- Choose date/time.
- Use default 3-hour duration if no end time is supplied.
- Add location/place metadata and place photo URL.
- Add a plan description.
- See upcoming, live, and past plans.
- Auto-transition plans to live when the start time arrives.
- Auto-transition plans to past after the end time.
- RSVP as going, maybe, or cannot go.
- Host is automatically counted as going.
- Host can close a live plan.
- Host can cancel a plan.
- Plan details show the group, host, RSVP status, going members, member count, description, and timing.
- Plan deep links open directly into the plan detail screen.

### Plan Hype

Mandali adds social excitement around plans before and during an event.

Use cases solved:

- Set a dress code for a plan.
- Add an outfit/look text.
- Add a shoutout.
- React to shoutouts with supported emojis.
- Vote on “who will show up” style participation.
- Bet on who may cancel last minute.
- Vote on configurable prediction questions.
- Show a lightweight activity feed built from RSVPs, bring claims, and outfits.
- Fetch hype data in one payload for plan detail tabs.
- Live-sync plan hype updates through Socket.io events.

### Bring List

Mandali helps a group coordinate items for a plan.

Use cases solved:

- Add an item people should bring.
- Optionally auto-claim the item when adding it.
- Claim an item.
- Unclaim an item.
- Prevent two different users from claiming the same item.
- Upvote items.
- Pin important items as the host.
- Delete bring items.
- Sort bring items with pinned items first, claimed items prioritized, then by upvote count.
- Live-sync bring item additions, claims, unclaims, pins, deletes, and upvotes.

### Hisaab: Shared Expense Management

Hisaab helps the group track shared expenses and settlements.

Use cases solved:

- See net balances across groups.
- See group-level ledger entries.
- Add an expense.
- Split an expense across selected participants.
- Support equal/exact participant shares through frontend components.
- Choose who paid.
- Track who added the expense.
- Associate expenses with a group or a specific plan.
- Record settlement payments.
- Calculate pairwise member balances.
- Generate simplified “who owes whom” reports.
- View expense detail with participants and group members.
- Edit expenses.
- Delete expenses.
- Delete settlements.
- Notify participants when an expense affects them.
- Notify paid users when a settlement is recorded.

### Real-Time Social Games

Mandali includes group games that work inside a private Mandali.

Use cases solved:

- Pick a group to play with.
- Select a game from the game registry/config.
- Host or join games.
- Open a lobby for a group.
- Deep link into games from push notifications.
- See game history/leaderboards.
- Link games to plans when the game is part of a meetup.

## 3. Authentication and Onboarding

### Login

Mandali uses Firebase phone authentication for OTP verification and then issues its own backend JWT.

Current flow:

- User enters phone number.
- Firebase verifies OTP.
- Backend `/auth/verify` verifies Firebase token.
- Backend finds or creates the user in Supabase.
- Backend blocks suspended/banned users from login.
- Backend stores terms acceptance for new or returning users.
- Backend returns:
  - Mandali JWT.
  - User profile.
  - `isNewUser`.

### Session Restore

- JWT is stored in AsyncStorage as `mandali_token`.
- User profile is stored as `mandali_user`.
- Root navigator listens to Firebase auth state.
- If Firebase user and Mandali token exist, the app restores the session.
- If cached user is missing, the app fetches `/auth/me`.
- Auth store is backed by Zustand.

### Profile Setup

Use cases solved:

- Required name/profile completion after login.
- User can update name.
- User can add/update birthday.
- User can upload avatar.
- Profile image uploads overwrite `mandali/profiles/user_{userId}` in Cloudinary.
- Name is checked against the moderation keyword filter.

### Terms and EULA

Mandali has a two-layer terms gate:

- Device-level EULA acceptance in AsyncStorage before login.
- Database-level `terms_accepted`, `accepted_at`, and `terms_version` after login.

This lets the app avoid showing terms repeatedly on one device while still syncing acceptance to the backend.

### Account Management

Use cases solved:

- Secure logout.
- Push notification enable/disable setting in local settings store.
- Permanent account deletion from profile menu.
- Legal links to privacy policy and terms.
- Profile edit flow.

## 4. Group System

### Group Creation

A user can create a Mandali with:

- Name.
- Optional description.
- Optional cover photo URL.
- Generated 8-character invite code.
- Creator added as admin.

Backend sanitizes cover image URL inputs, including legacy stringified object cases.

### Group List

The group list returns:

- Group fields.
- Member count.
- Current user role.
- Total game winnings for the user in that group.
- Memory count.
- Unseen memory count.
- Stored group pulse score and rank.

Unseen memory count is based on memories from other users after the user’s `last_seen_memories_at`.

### Group Detail

The group detail view includes:

- Hero cover photo or fallback people icon.
- Group name.
- Member count.
- Year created.
- Group description.
- Member list.
- Invite code.
- Group admin controls.
- Leave/delete controls.
- Ownership transfer flow.
- Moderation/safety options.
- Group Pulse card when eligible.

### Joining Groups

Use cases solved:

- Join using invite code.
- Reject empty invite code.
- Reject invalid invite code.
- Reject if user is already a member.
- Emit group membership socket event on successful join.

### Leaving Groups

Rules:

- Any member can leave.
- Admin cannot leave a multi-member group until ownership is transferred.
- Single-member admin can delete/leave as part of delete flow.

### Ownership Transfer

Rules:

- Only current admin can transfer ownership.
- Target must be a group member.
- Target becomes admin.
- Old admin becomes member.
- Group `admin_user_id` is updated.
- Group membership update is emitted over sockets.

## 5. Group Pulse

Group Pulse measures how active a Mandali is.

### Pulse Availability

Pulse is only shown when:

- Group is at least 7 days old.
- Group has more than 1 member.

### Pulse Ranks

Current rank buckets:

- `0-19`: Just Getting Started
- `20-39`: Warming Up
- `40-59`: Active
- `60-79`: Vibing
- `80-100`: On Fire

### Pulse Inputs

The backend pulse utility considers:

- Active members in the last 30 days.
- Newly joined members.
- Members who viewed memories.
- Plan RSVPs.
- Blink game participation.
- Memory uploads.
- Memory reactions.
- Plan creation and completion.
- RSVP count.
- Game count and rematches.
- Memory captions and unique reactors.
- Recency decay, so newer activity matters more.
- Breadth of participation, so activity from more members improves the score.

### Pulse Cron

Pulse is recalculated in `pulseCron`.

Schedule:

- 12:00 AM IST
- 6:00 AM IST
- 12:00 PM IST
- 6:00 PM IST

Persisted fields:

- `pulse_score`
- `pulse_rank`
- `pulse_delta`
- `pulse_percentile`
- `pulse_leaderboard_rank`
- `pulse_leaderboard_total`
- `pulse_last_calculated_at`

The detail API reads stored pulse values instead of recalculating on every screen open.

### Pulse Display

Frontend pulse screens/cards show:

- Score out of 100.
- Rank label and icon.
- Delta since last stored calculation.
- Hype/encouragement text.
- Comparison against other Mandalis.
- Leaderboard rank when available.
- Recent plan participation.
- Monthly overview:
  - Plans created.
  - Games played.
  - Memories shared.
  - Hisaab settled amount.
- Meetup streak.
- Past plans used for streak calculations.

### Pulse Notifications

If pulse increases during cron:

- A group in-app notification is created.
- A group push notification is sent.
- Drops/unchanged scores are silent DB updates.

## 6. Memories

### Memory Uploads

Users can create memories with:

- Group ID.
- One or more image URLs.
- Optional story/caption.
- Optional memory date.
- Optional plan ID.

Rules:

- A memory must have at least one image.
- Story text is checked by moderation filter.
- User has a 200-memory-image limit.
- Memory date defaults to current date.
- Images upload directly to Cloudinary through signed upload params.

### Memory Browsing

The memory API supports:

- Pagination.
- Limit/page query params.
- Optional `planId` filter.
- Sorting by `memory_date` descending.
- Hidden content filtering.
- Blocked-user filtering.
- Reported-content filtering.
- Comment count enrichment.
- Reaction summary enrichment.
- Current user’s reaction enrichment.

### Memory Reactions

Users can:

- Add a reaction.
- Change a reaction.
- Tap the same reaction again to remove it.
- Fetch all reactions with user data.
- See aggregate reaction counts.
- See own selected reaction.

Notifications:

- Memory owner gets push and in-app notification when someone else reacts.

### Memory Comments

Users can:

- Fetch comments for a memory.
- Add a comment.
- Delete their own comment.

Rules:

- Empty comments are rejected.
- Comment text is checked by moderation filter.
- Comments from blocked users are hidden.
- Hidden comments are excluded.

Notifications:

- Memory owner gets push and in-app notification when someone else comments.

### Memory Deletion

- Users can delete their own memory.
- Users can delete their own comments.
- Admin moderation can force-delete memories/comments.

## 7. Plans

### Plan Activities

Plans are based on activities.

Users can:

- Search existing activities in a group.
- Create a new activity by name.
- Use frontend activity suggestions/icons.

Backend protects activities by group membership.

### Plan Creation

Plan fields:

- Group ID.
- Activity ID or new activity name.
- Activity label.
- Start time.
- Optional end time.
- Optional location.
- Optional place ID.
- Optional place photo URL.
- Optional description.
- Optional plan association with features like memories/Hisaab/games.

Rules:

- User must be a group member.
- Start time must be in the future.
- End time must be after start.
- If end time is not provided, backend defaults to 3 hours.
- Host RSVP is inserted automatically as going.

Notifications/events:

- Group notification for plan creation.
- Push notification for scheduled plan.
- Socket `plan_updated` event.

### Plan Listing

Users can fetch plans:

- Across all groups they belong to.
- Filtered by `upcoming`, `live`, or `past`.
- Sorted by status-aware start time.

Frontend has:

- Plans home.
- Plan sections/tabs.
- Empty states.
- Plan cards.
- Upcoming/live/past plan presentation.

### Plan Detail

Plan detail includes:

- Hero section.
- Activity title.
- Group info.
- Host info.
- Date/time.
- Location.
- Description.
- RSVP section.
- People/attendees.
- Save/action bar.
- Tabs for details, bring, hype, and live plan context.
- Links into Hisaab, memories, and games when plan-specific workflows are used.

### RSVP

Supported statuses:

- `going`
- `maybe`
- `cant_go`

Behavior:

- User can create or update RSVP.
- Optional RSVP note.
- Host is treated as going if no RSVP row exists.
- Host gets notification when another member RSVPs.
- RSVP changes emit `plan_updated` and `plan_hype_updated`.

### Live and Past Lifecycle

Cron automatically:

- Moves due upcoming plans to `live`.
- Moves ended plans to `past`.
- Sends live notifications when a plan starts.

Host can manually close a live plan.

### Plan Cancellation

Host can cancel a plan.

Backend cleanup includes:

- Plan RSVPs.
- Bring items and upvotes.
- Hype settings/votes/outfits/shoutouts/reactions.
- Housie/Blink game `plan_id` unlinking.
- Plan deletion.
- Plan cancelled notification.
- Socket `plan_updated` event.

## 8. Plan Hype

Plan hype is designed to increase anticipation and participation around a plan.

### Dress Code

- Host/member can set a short dress code text.
- Text is trimmed and length-limited.

### Outfits

- Users can set their own outfit/look text.
- One outfit per user per plan.
- Upsert behavior updates existing entry.

### Shoutouts

- Users can add short shoutout messages.
- Duplicate shoutout per user/plan is blocked by DB uniqueness handling.
- Shoutouts support emoji reactions.

Supported reaction emojis:

- 🔥
- 🎉
- 😄
- ❤️
- 👀
- ✨

### Prediction Questions

- Active prediction questions are loaded from backend.
- If no DB questions exist, default question is “Who cancels at last minute?”
- Questions may be single-select or multi-select.
- Votes can be toggled.
- Single-select questions remove previous vote for that question/user.

### Show Votes and Cancel Bets

Users can:

- Vote on who will show.
- Bet who might cancel.
- Toggle cancel bets.

### Hype Feed

Backend builds a short feed from:

- RSVPs.
- Claimed bring items.
- Outfit updates.

The feed is sorted newest-first and capped.

## 9. Bring List

Bring list helps the group coordinate items around a plan.

Features:

- Fetch bring items.
- Add item.
- Auto-claim on add.
- Claim item.
- Unclaim item.
- Prevent claiming someone else’s item.
- Show claimer name/avatar.
- Upvote/un-upvote.
- Show upvote counts.
- Pin/unpin items as host.
- Delete items.
- Sort pinned first, then claimed status, then upvotes.
- Emit real-time events for every change.

Use cases solved:

- “Who is bringing drinks?”
- “Who will bring snacks?”
- “This item is important, keep it pinned.”
- “I can no longer bring this, unclaim it.”
- “This suggested item is useful, upvote it.”

## 10. Hisaab

Hisaab is Mandali’s expense-sharing and settlement module.

### Home Balances

The app can show net balance per group for the current user:

- Expenses paid by user increase balance.
- User’s participant shares reduce balance.
- Settlements paid/received adjust balance.
- Optional plan-specific filtering.

### Group Ledger

Group ledger merges:

- Expenses.
- Settlements.

Each expense includes:

- Description.
- Amount.
- Paid by.
- Added by.
- Expense type.
- Created date.
- Participants and their shares.

Each settlement includes:

- Amount.
- From user.
- To user.
- Created date.

### Expense Detail

Expense detail fetches:

- Expense fields.
- Payer.
- Adder.
- Group name.
- Participants.
- Group members for editing context.

### Add Expense

Users can:

- Select group/plan context.
- Add description.
- Enter amount.
- Choose payer.
- Choose split strategy.
- Select participants.
- Add exact shares.
- Save expense.

Notifications:

- Participants get push notifications with their share.
- In-app notifications are created for affected participants.

### Settle Balance

Users can:

- Record payment from one member to another.
- Associate settlement with group or plan.
- Notify recipient.

### Simplified Balances

Backend computes:

- Net balance per group member.
- Simplified debtor-creditor reports.

This solves “who owes whom” without requiring every pairwise transaction to be tracked manually.

## 11. Housie Game

Housie is a real-time Tambola-style game.

### Setup

Users can:

- Create a game inside a group.
- Schedule a game.
- Link a game to a plan.
- Set game title.
- Set ticket price.
- Configure host settings.
- Choose game mode/style.
- Define prizes/bounties.
- Join waiting room.
- Buy/update ticket count before game starts.

### Game Styles

Supported styles:

- Classic Housie.
- Plus One: mark called number + 1.
- Minus One: mark called number - 1.
- Reverse Mode: reverse two-digit numbers where applicable.

### Prize Catalogue

Standard prizes:

- Top Line.
- Middle Line.
- Bottom Line.
- Full House.

Manual/bonus prizes include:

- Four Corners.
- Six Corners.
- Star.
- Center/Laddu.
- Pyramid.
- Odd/Even.
- Early 5.
- Early 7.
- BP/Temperature.
- Breakfast.
- Lunch.
- Dinner.
- Verticals.

Full House is repeatable and can be auto-numbered by the frontend.

### Gameplay

Backend:

- Generates a 6-character game code.
- Pre-generates draw sequence.
- Stores called numbers.
- Calls numbers manually or through auto-host.
- Emits real-time number updates.
- Ends game when draw sequence finishes.
- Stores results in `game_results`.

Frontend:

- Waiting room.
- Starting countdown.
- Main game board.
- Ticket screen.
- Claim UI.
- Claim checking indicator.
- Win notifications.
- Results screen.
- Leaderboard screen.
- Spectator screen.

### Host Controls

Host can:

- Start/activate game.
- Call next number.
- Pause game.
- Resume game.
- Cancel game.
- Verify claims.
- Define prize bounties.
- Use manual or auto calling.

### Ticket Logic

Backend utilities provide:

- Tambola ticket generation.
- Draw sequence generation.
- Prize validation.
- Line validation.
- Full house validation.
- Early number validation.
- Corner/star/center/pyramid/odd-even/BP/column-set validation.

### Real-Time Housie

Socket events support:

- Joining game room.
- Number called.
- Game paused/resumed/ended.
- Claim prize.
- Verify claim.
- Claim result.
- Ticket updates.
- Global notifications.

### Housie Notifications

Mandali sends:

- Game created push/in-app notification.
- Scheduled game notification.
- Game starting notification.
- Win/claim-related in-app UI notifications.

## 12. Blink Game

Blink is a fast symbol-matching game.

### Setup

Users can:

- Create a Blink match.
- Schedule a Blink match.
- Link Blink to a plan.
- Choose title.
- Configure max players.
- Configure cards per player.
- Configure symbols per card.
- Choose theme.
- Join waiting room.

### Game Codes

Blink uses a 6-character game code from readable non-ambiguous characters.

### Game Flow

Statuses include:

- Scheduled.
- Waiting.
- Starting.
- Active.
- Ended.
- Cancelled.

### Gameplay

Players match a shared center card symbol with their own current card.

Backend behavior:

- Uses in-memory game state for low-latency play.
- Restores game from DB if memory is missing.
- Uses per-game concurrency lock to avoid race conditions during taps.
- Updates RAM immediately.
- Persists DB state asynchronously.
- Emits shared state updates.
- Emits personal next-card updates only to the acting player.
- Tracks remaining cards.
- Records winners and prizes in `game_results`.

Frontend:

- Blink lobby.
- Join screen.
- Waiting room.
- Starting screen.
- Game screen.
- Header and spectator panels.
- Finished panel.
- Results and leaderboard screens.

### Blink Assets

Blink uses symbol assets such as:

- Heart.
- Cherry.
- Moon.
- Gamepad.
- Apple.
- Flame.
- Rocket.
- Dices.
- Balloon.
- Zap.
- Camera.
- Crown.
- Trophy.
- Many other symbol SVGs in the default theme.

### Blink Notifications

Mandali sends:

- Blink room open push/in-app notification.
- Blink scheduled notification.
- Blink starting notification.
- Blink game cancelled/ended socket events.

## 13. Game Selection and Registry

The app has a game selection flow:

- Select group.
- Select available game.
- Open game lobby.

Game availability is feature-config driven:

- Housie enabled unless `GAME_HOUSIE_ENABLED=false`.
- Blink enabled when `GAME_BLINK_ENABLED=true`.

The config endpoint returns game title, subtitle, icon, and enabled status.

## 14. Notifications

Mandali supports both push notifications and in-app notifications.

### Push Notifications

Frontend:

- Registers Expo push token.
- Sends token to backend.
- Handles notification taps.
- Opens deep links from payload URLs.

Backend:

- Sends user push notifications.
- Sends group push notifications.
- Excludes actor/sender where appropriate.

### In-App Notifications

Notification types include:

- Pulse increased.
- Plan created.
- Plan updated.
- Plan RSVP.
- Plan cancelled.
- Memory added.
- Memory comment.
- Memory reaction.
- Streak updated.
- Hisaab added.
- Hisaab settled.
- Housie created.
- Blink created.
- Birthday wish.
- Birthday today.
- Birthday upcoming.
- Content removed.

Notification screen supports:

- Fetch recent notifications.
- Pull to refresh.
- Icons by notification type.
- Unread visual indicator.
- Auto-mark unread notifications as read on screen load.
- Group name pill.
- Memory thumbnails in notification cards.
- Empty state.

Unread count endpoint supports badges/indicators elsewhere.

### Notification Filtering

Notifications exclude actor content from blocked users where possible.

## 15. Scheduled Jobs and Automation

### Birthday Cron

Runs daily at midnight IST.

Behaviors:

- Finds users whose birthday is today.
- Sends personal birthday wish.
- Notifies all group members except birthday person.
- Finds birthdays 3 days away.
- Notifies group members except birthday person as a surprise.
- Dedupe logic prevents duplicate birthday notifications for the same run date.

### Pulse Cron

Runs four times daily and recalculates group pulse.

See Group Pulse section for details.

### Plan Lifecycle Cron

Behaviors:

- Activates due plans.
- Completes ended plans.
- Sends live notifications.
- Sends RSVP reminders:
  - One-day reminder window.
  - Final reminder window roughly 1-2 hours before start.
- Sends inactivity nudges when a group has had no plans for 15 days.
- Uses notification delivery records/dedupe keys to avoid repeated spam.
- Uses a 5-day inactivity cooldown bucket.

### Game Engine Schedulers

Housie:

- Scheduled game start reminders.
- Auto-host number calling.
- Pause/resume/stop/reset auto-host timer.
- Monitor scheduled games.

Blink:

- Scheduled Blink start.
- Delayed activation.
- Cancel scheduled activation.
- Preload/restore active game memory.

## 16. Deep Links, App Links, and Landing Pages

### Custom Scheme

The app scheme is:

- `mandali://`

Supported deep link features:

- `mandali://join/:inviteCode`
- `mandali://housie/:gameCode/:groupId`
- `mandali://blink/:gameCode/:groupId`
- `mandali://memories/:groupId/:memoryId`
- `mandali://plans/:planId`
- `mandali://hisaab/:expenseId`

### Web Landing Routes

Backend serves landing pages for:

- `/join/:id`
- `/housie/:id`
- `/memories/:id`
- `/hisaab/:id`
- `/plans/:id`

The landing page:

- Shows Mandali logo.
- Uses feature-specific title/subtitle/button copy.
- Attempts to open the app.
- Has manual “Download from App Store” or “Download from Google Play” link.
- Uses Android intent URLs for Play Store fallback.
- Uses hardcoded iOS App Store URL:
  - `https://apps.apple.com/in/app/mandali-group-companion/id6780851347`

### Universal/App Links

Backend serves:

- `/.well-known/apple-app-site-association` via `/apple-app-site-association`.
- `/assetlinks.json`.

iOS app config includes associated domain:

- `applinks:api.mandaliapp.com`

Android app config includes intent filters for:

- `/join`
- `/housie`
- `/memories`

## 17. Safety, Moderation, and Trust

### Content Filtering

The app uses a keyword-based moderation filter for:

- Profile names.
- Memory stories.
- Memory comments.

### Reports

Users can report:

- Memories.
- Comments/content items.

Report behavior:

- Prevent reporting own content.
- Upsert one report per reporter/content.
- Store reason, content type, group, owner, notes.
- Notify developer through logs and optional `ADMIN_WEBHOOK_URL`.
- If reports reach 50% of group members, hide the content.
- Notify content owner when removed by threshold.

### Blocking

Users can:

- Block another user.
- Unblock a user.
- Fetch blocked user IDs.

Blocking effects:

- Memory feeds hide blocked users both ways.
- Comments hide blocked users.
- Notifications filter actors from blocked users where supported.

### Admin Moderation

Admin endpoints support:

- List reports.
- Filter reports by status.
- Update user status to active, suspended, or banned.
- Disconnect suspended/banned users’ sockets.
- Force-delete memories.
- Force-delete comments.
- Resolve or dismiss reports.

### Account Status Enforcement

Auth denies login to banned/suspended accounts.

## 18. Legal, Compliance, and Support

Backend serves public pages:

- Privacy Policy: `/privacy`
- Terms of Service: `/terms`
- Delete Account page: `/delete-account`
- Support page: `/support`
- Logo: `/logo.png`

Support form:

- Accepts name, email, and message.
- Logs support request.
- Has TODO for email delivery.
- Redirects with success status.

App profile menu links to:

- Privacy Policy.
- Terms of Service.

Account deletion is available in app and documented via legal route.

## 19. App Update and Remote Configuration

### App Version Guard

The backend can enforce or recommend app updates using headers:

- `X-Mandali-Platform`
- `X-Mandali-Version`
- `X-Mandali-Build`

Version config includes:

- Minimum supported Android build.
- Minimum supported iOS build.
- Latest Android build.
- Latest iOS build.
- Minimum/latest version text.
- Force update message.
- Recommend update message.
- Android Play Store URL.
- iOS App Store URL.

Current iOS App Store URL is hardcoded in backend app version route:

- `https://apps.apple.com/in/app/mandali-group-companion/id6780851347`

### App Config Endpoint

`/config/app-config` returns:

- Hisaab enabled per platform.
- Plans enabled per platform.
- Minimum supported versions.
- Enabled games.

Frontend uses this config to:

- Hide/show Plans tab.
- Hide/show games.
- Gate Hisaab availability.

## 20. Upload and Media Storage

Mandali uses Cloudinary.

### Upload Signing

Backend route:

- `GET /upload/sign`

Supported upload types:

- `profile`
- `memory`

Profile upload config:

- Folder: `mandali/profiles`
- Public ID: `user_{userId}`
- Overwrite enabled.
- 400x400 crop transformation.

Memory upload config:

- Requires `groupId`.
- Verifies user is group member.
- Folder: `mandali/{groupId}/photos`.

Limits:

- 10MB multipart limit remains configured for legacy/deprecated upload paths.
- Memory image limit is 200 images per user.

Frontend optimizes Cloudinary URLs by injecting transformations such as:

- `w_300,q_auto,f_auto`
- `q_auto,f_auto`

## 21. Realtime System

Mandali uses Socket.io.

### Connection

- JWT verified during socket handshake when provided.
- Authenticated sockets store `userId`.
- Guest sockets can still register game/chat handlers in limited contexts.
- Online user map tracks connected users.
- `online_status` is broadcast on connect/disconnect.

### Rooms

Common rooms:

- `user_{userId}`
- `group_{groupId}`
- Housie game code room.
- Blink game code room.

### Group Events

Group events include:

- Group created.
- Group updated.
- Member joined.
- Member left.
- Membership changed.

### Plan Events

Plan events include:

- `plan_updated`
- `plan_hype_updated`
- Bring-item specific events.

### Game Events

Housie and Blink each have their own socket handlers and event names for game state, joins, starts, claims, number calls, match attempts, winners, cancellation, and end states.

## 22. Chat

The backend contains chat handlers and chat routes.

Supported behavior visible in code:

- Message delete via socket and route.
- Deleted messages are soft-deleted by setting `is_deleted`, clearing content/media.
- `message_deleted` event broadcast to group.
- Chat handlers are registered for sockets.

This appears to be infrastructure for group chat or game/group messaging, even if not a primary tab in the current navigation.

## 23. Frontend Navigation Structure

### Root

Root navigator handles:

- EULA gate.
- Auth flow.
- Profile setup gate.
- Main tab navigator.
- Deep link routing.
- Push notification routing.
- Pending deep link persistence until auth/profile are ready.
- Global Housie notification manager.

### Tabs

Main tabs:

- Groups.
- Plans, if enabled.
- Games.
- Memories.
- Profile.

Memories tab shows unseen memory badge.

### Groups Stack

Screens include:

- Group list.
- Create/edit group.
- Join group.
- Group detail.
- Group Pulse.
- Notifications.
- Expense detail integration for Hisaab deep link.

### Plans Stack

Screens include:

- Plans home.
- Create plan.
- Plan details.

### Games Stack

Screens include:

- Game group selection.
- Game selection.
- Shared game lobby.
- Housie host settings.
- Housie join.
- Housie bounty/prize definition.
- Housie waiting room.
- Housie starting.
- Housie game.
- Housie ticket.
- Housie results.
- Housie leaderboard.
- Housie spectator.
- Blink lobby.
- Blink join.
- Blink waiting room.
- Blink starting.
- Blink game.
- Blink host settings.
- Blink leaderboard.
- Blink results.

### Memories Stack

Screens include:

- Select group for memories.
- Memories home/gallery.
- Create memory.
- Memory detail.

### Hisaab Stack

Screens include:

- Hisaab home.
- Group Hisaab.
- Add expense.
- Expense detail.
- Settle balance.

### Profile Stack

Screens include:

- Profile menu.
- Setup/update profile.

## 24. Frontend State and Data Fetching

### React Query

Used for server state:

- Groups.
- Group detail.
- Group pulse.
- Memories.
- Comments/reactions.
- Hisaab data.
- Games.
- Plans.
- Plan hype.
- Bring items.
- Notifications.
- Config.

### Zustand Stores

Stores include:

- Auth store.
- Housie store.
- Hisaab store.
- Settings store.

### AsyncStorage

Used for:

- Mandali JWT.
- User profile.
- EULA accepted flag.
- Pending deep link.
- Local settings persistence where applicable.

## 25. Design System and UX Details

Visual identity:

- Warm cream background `#FDF9F3`.
- Primary magenta `#b30069`.
- Dark mauve/brown text `#594048`.
- Rounded cards and soft shadows.
- Premium/cozy social design.
- Large hero sections.
- Responsive mobile/tablet sizing.
- NativeWind/Tailwind classes.
- Be Vietnam Pro and Noto Serif font packages.

Adaptive UI:

- `useIsTablet` checks viewport width.
- Tablet increases font sizes, icons, touch targets, paddings.
- Tablet memories grid uses higher density.
- Tablet forms are centered and less stretched.

Common controls/components:

- MandaliCard.
- SearchBar.
- HostSettingsHeader.
- SchedulingSection.
- RoomDetailsSection.
- MandaliDatePicker.
- MandaliCoin.
- PinchableImage.
- AppUpdateGate.

## 26. Data and Main Tables Implied by Code

Important tables used by the app:

- `users`
- `groups`
- `group_members`
- `memories`
- `memory_comments`
- `memory_reactions`
- `reports`
- `blocked_users`
- `notifications`
- `notification_deliveries`
- `expenses`
- `expense_participants`
- `settlements`
- `plans`
- `plan_activities`
- `plan_rsvps`
- `plan_bring_items`
- `plan_bring_item_upvotes`
- `plan_hype_settings`
- `plan_hype_outfits`
- `plan_hype_shoutouts`
- `plan_hype_shoutout_reactions`
- `plan_hype_show_votes`
- `plan_hype_cancel_bets`
- `plan_hype_prediction_questions`
- `plan_hype_prediction_votes`
- `housie_games`
- `housie_tickets`
- `blink_games`
- `blink_players`
- `blink_cards`
- `game_results`

## 27. API Surface Summary

### Auth

- `POST /auth/verify`
- `GET /auth/me`
- `PATCH /auth/profile`
- `DELETE /auth/profile`
- `POST /auth/push-token`

### Groups

- `POST /groups`
- `GET /groups`
- `GET /groups/:id`
- `POST /groups/:id/seen-memories`
- `GET /groups/:id/blink-games`
- `POST /groups/join`
- `PATCH /groups/:id`
- `DELETE /groups/:id`
- `POST /groups/:id/leave`
- `POST /groups/:id/transfer-ownership`
- `GET /groups/:id/pulse`

### Memories

- `GET /memories/group/:groupId`
- `POST /memories`
- `DELETE /memories/:id`
- `GET /memories/:id/comments`
- `POST /memories/:id/comments`
- `DELETE /memories/comments/:commentId`
- `GET /memories/:id/reactions`
- `POST /memories/:id/reactions`

### Hisaab

- `GET /hisaab/balances`
- `GET /hisaab/ledger/:groupId`
- `GET /hisaab/expense/:id`
- `GET /hisaab/members/:groupId`
- `POST /hisaab/expense`
- `POST /hisaab/settle`
- `DELETE /hisaab/expense/:id`
- `DELETE /hisaab/settlement/:id`
- `PUT /hisaab/expense/:id`

### Plans

- `GET /plans/activities`
- `POST /plans/activities`
- `POST /plans`
- `GET /plans`
- `POST /plans/:id/rsvp`
- `POST /plans/:id/close`
- `DELETE /plans/:id`
- `GET /plans/:id`
- `GET /plans/:id/bring`
- `POST /plans/:id/bring`
- `POST /plans/:id/bring/:itemId/claim`
- `DELETE /plans/:id/bring/:itemId/claim`
- `POST /plans/:id/bring/:itemId/upvote`
- `DELETE /plans/:id/bring/:itemId`
- `POST /plans/:id/bring/:itemId/pin`
- `GET /plans/:id/hype`
- `PUT /plans/:id/hype/outfit`
- `PUT /plans/:id/hype/dress-code`
- `POST /plans/:id/hype/shoutouts`
- `POST /plans/:id/hype/shoutouts/:shoutoutId/reactions`
- `POST /plans/:id/hype/show-votes`
- `POST /plans/:id/hype/cancel-bets`
- `POST /plans/:id/hype/prediction-votes`

### Housie

- `GET /housie/prizes`
- `GET /housie/styles`
- `POST /housie/create`
- `GET /housie/active/:groupId`
- `GET /housie/group/:groupId/list`
- `PATCH /housie/:gameCode/activate`
- `POST /housie/:gameCode/cancel`
- `GET /housie/:gameCode`
- `POST /housie/:gameCode/call`
- `POST /housie/:gameCode/pause`
- `POST /housie/:gameCode/resume`
- `POST /housie/:gameCode/verify`
- `GET /housie/:gameCode/participants`
- `POST /housie/:gameCode/join`
- `GET /housie/:gameCode/tickets`
- `GET /housie/ticket/:ticketId`
- `PATCH /housie/:gameCode/status`
- `GET /housie/:gameCode/results`
- `GET /housie/group/:groupId/leaderboard`
- `PATCH /housie/:gameCode/tickets/update`

### Blink

- `POST /blink/games`
- `POST /blink/games/schedule`
- `GET /blink/games/:gameCode/player`
- `GET /blink/games/:gameCode/players`
- `GET /blink/games/:gameCode`
- `GET /blink/games/group/:groupId`
- `POST /blink/games/:gameCode/start`
- `POST /blink/games/:gameCode/cancel`
- `POST /blink/games/:gameCode/join`
- `POST /blink/games/:gameCode/end`
- `GET /blink/games/:gameCode/results`
- `GET /blink/games/group/:groupId/leaderboard`

### Notifications

- `GET /notifications`
- `POST /notifications/read`
- `GET /notifications/unread-count`

### Moderation

- `POST /moderation/report`
- `POST /moderation/block`
- `GET /moderation/blocked`
- `DELETE /moderation/block/:blockedId`
- `GET /moderation/admin/reports`
- `POST /moderation/admin/users/:id/status`
- `DELETE /moderation/admin/memories/:id`
- `DELETE /moderation/admin/comments/:id`
- `POST /moderation/admin/reports/:id/resolve`

### Upload

- `GET /upload/sign`

### Config, Legal, Deep Links, Version

- `GET /config/app-config`
- `GET /app-version`
- `GET /privacy`
- `GET /terms`
- `GET /delete-account`
- `GET /support`
- `POST /support`
- `GET /join/:id`
- `GET /housie/:id`
- `GET /memories/:id`
- `GET /hisaab/:id`
- `GET /plans/:id`
- `GET /apple-app-site-association`
- `GET /assetlinks.json`
- `GET /health`

## 28. Current Platform Configuration

App identity:

- App name: Mandali.
- Expo slug: `mandali`.
- Scheme: `mandali`.
- iOS bundle ID: `com.mandaliapp.mandaliapp`.
- Android package: `com.mandaliapp.mandali`.
- Current app version in `app.json`: `1.1.3`.
- Current iOS build number: `15`.
- Current Android version code: `15`.
- iOS App Store Connect app ID in `eas.json`: `6780851347`.

Permissions and native capabilities:

- Camera.
- Photo library read/add.
- Location when in use.
- Push notifications.
- Background fetch/remote notification modes on iOS.
- Google Maps API config on Android.
- Universal/App links.

## 29. What Makes Mandali Different

Mandali is not only a chat or photo-sharing app. It combines several small but important group-life workflows:

- “Let’s make a group.”
- “Invite everyone privately.”
- “Let’s plan something.”
- “Who is coming?”
- “What should we bring?”
- “Let’s hype it before we meet.”
- “Let’s play something while together.”
- “Let’s split what we spent.”
- “Let’s save the memories.”
- “Let’s keep this group active.”

The app’s value is in connecting planning, memories, money, and games around the same private group identity.

## 30. Current Implementation Notes

- Supabase is the primary database and relational source of truth.
- Cloudinary hosts images.
- Expo push notifications are used for push delivery.
- Socket.io powers real-time group/game/plan sync.
- React Query owns most server-state caching.
- Zustand owns auth/settings and selected local state.
- Feature flags can hide Plans, Hisaab, and games per platform.
- Group Pulse is cron-owned and persisted, not calculated on every UI view.
- Block/report systems are integrated into memory and notification visibility.
- Deep links are stored as pending when the app is not ready or the user is not authenticated/profile-complete.
- Legal/support pages are served by the backend, useful for App Store/Play Store compliance.

