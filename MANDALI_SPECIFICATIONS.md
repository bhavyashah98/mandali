# Mandali Project Specifications & Handover Document

This document serves as the "source of truth" for the **Mandali** platform—a high-fidelity social gaming and memory-preservation app for families. It contains the complete technical architecture, design system, and business logic required for further development.

---

## 1. Technical Stack
- **Frontend**: React Native with Expo (Managed Workflow)
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Backend**: Node.js / Express / TypeScript
- **Database**: Supabase (PostgreSQL) + Realtime
- **Authentication**: Custom JWT (Standard) with Firebase Phone Auth (Planned/Integrated)
- **Real-time Engine**: Socket.io (scoped by Game Code and Group ID)
- **Image Hosting**: Cloudinary (Structured folders via `groupId`)

---

## 2. Design System & Aesthetics
- **Core Aesthetic**: Premium, warm, and cozy. Uses "Bento Grid" layouts, heavy rounded corners (`32px`+), and blurred glass overlays.
- **Theme Colors**:
  - `Primary`: `#b30069` (Magenta/Deep Pink)
  - `Surface`: `#FDF9F3` (Cream/Off-white)
  - `Text-Primary`: `#594048` (Dark Brown/Mauve)
  - `Text-Secondary`: `#a8a29e` (Stone Gray)
- **Typography**: 
  - Headlines: Bold, serif/modern sans-serif.
  - Body: Soft sans-serif (Inter/Outfit style).
- **Key UI Patterns**:
  - **The "Oops Boggy" Stamp**: A primary-colored diagonal overlay stamp that locks a ticket when a false claim is denied.
  - **Shared Claim Window**: Orange-tinted status indicators showing that a prize is currently "In Review" or "Splitting."

---

## 3. Core Workflow: Housie (Tambola) Engine
The Housie module is the most complex part of the app, utilizing a real-time state machine.

### **Game States**
1. `waiting`: Players join, buy tickets, and wait in the lobby.
2. `active`: Host is calling numbers. Tickets are interactive.
3. `finished`: Game over, results are tabulated into `game_results`.

### **Prize Logic (Hierarchy)**
- **Standard Prizes**: Top Line, Middle Line, Bottom Line, Early Five, Corners, etc.
- **Full House Hierarchy**: Mandatory three-tier (Full House 1 > Full House 2 > Full House 3).
- **The "Shared Window" Rule**: 
  - A prize is only permanently "Closed" when the **next number** is drawn.
  - If Player A claims "Top Line" on Number 42, the button stays active ("Claim Share") for others. If Player B also marks 42 and claims, they split the prize.
  - Once Number 43 is called, "Top Line" locks for everyone who hasn't claimed yet.

### **Validation & Anti-Cheat**
- **1+1 Rule**: A single ticket can only win **one standard prize** and **one Full House**. After winning one of each, that ticket's buttons are disabled for that category.
- **Disqualification**: A manual "Deny" by the Host marks the ticket as `Boggy` in the DB (`__denied` cache). This is persistent across app reboots.

---

## 4. API Contract Reference

### **Base URL**: `${API_URL}`

#### **Authentication**
- `GET /auth/me`: Fetch current profile.
- `PATCH /auth/profile`: Update name, birthday, and avatar.

#### **Groups**
- `GET /groups`: Fetch all joined groups.
- `POST /groups`: Create new group (requires `name`, `description`).

#### **Uploads (Cloudinary Integration)**
- `POST /upload/image?groupId={id}`: 
  - folder: `mandali/{groupId}/photos`
  - Required for: Memories, Group Cover Photos.
- `POST /upload/profile`: 
  - folder: `mandali/profiles`
  - Overwrites previous photo using `public_id: user_{userId}`.

#### **Housie Game**
- `POST /housie/create`: Initialize game lobby.
- `PATCH /housie/:gameCode/activate`: Set prizes and start the session.
- `POST /housie/:gameCode/join`: Purchase `n` tickets for the user.
- `GET /housie/:gameCode/tickets`: Fetch the user's tickets + current marking state.
- `GET /housie/:gameId/results`: Fetch final winners list.

---

## 5. Socket.io Protocol
**Global Events**:
- `join_group (groupId)`: Listens for `game_created` to notify lobby members.

**Game Events (Room: `gameCode`)**:
- `join_game`: Connects player to specific session.
- `number_called`: Emitted when Host draws a ball. Payload: `{ nextNumber, calledNumbers }`.
- `claim_prize`: Player sends a claim. Payload: `{ ticketId, prizeId, markedNumbers }`.
- `verify_claim`: Host accepts/denies. Payload: `{ status: 'accepted' | 'denied' }`.
- `claim_result`: Broadcast to all. Triggers `queryClient.invalidateQueries` to refresh prize status UI.

---

## 6. Database Schema (Supabase)
### **Tables**
- `users`: `id, phone, name, avatar_url, birthday`
- `groups`: `id, name, description, cover_photo_url`
- `group_members`: `id, group_id, user_id, role`
- `housie_games`: `id, game_code, status, winners (JSONB), prizes (JSONB), called_numbers`
- `housie_tickets`: `id, game_id, user_id, ticket_data (JSONB)`
- `memories`: `id, group_id, user_id, image_urls, story`
- `game_results`: `id, game_id, user_id, prize_name, prize_amount`

### **Critical Indexes (Apply for Performance)**
```sql
CREATE INDEX idx_group_members_composite ON group_members(group_id, user_id);
CREATE INDEX idx_housie_games_game_code ON housie_games(game_code);
CREATE INDEX idx_memories_created_at ON memories(created_at DESC);
CREATE INDEX idx_game_results_group_id ON game_results(group_id);
```

---

## 7. Developer Notes
- **State Management**: Uses `@tanstack/react-query` for all GET requests and mutations. Cache invalidation on socket events is crucial for real-time consistency.
- **Image Selection**: Uses `expo-image-picker`. URIs must be converted to `FormData` or Base64 for Cloudinary.
- **Persistence**: Token is stored in `AsyncStorage` via `mandali_token`.
