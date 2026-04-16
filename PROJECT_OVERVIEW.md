# Mandali - Project Overview

Mandali is a premium social utility application designed for tight-knit groups to manage shared expenses, archive memories, and play real-time games with high-fidelity, adaptive UI for both mobile and tablet devices.

---

## 💎 High-Fidelity Tablet Experience (New)
The entire application has been overhauled with an **"Adaptive-Premium"** design philosophy to leverage the expansive screen real estate of iPads and tablets.
- **Cinematic Layouts**: Group details and memory galleries feature large, high-resolution hero sections and expanded content blocks.
- **Max-Width Centered UI**: Forms (Join, Create) and Profile hubs utilize centered containers (max-width 600-800px) to prevent layout stretching on wide screens.
- **Responsive Typography & Scaling**: Systematic boost in font sizes, touch targets, and icons specifically for tablet dimensions (>500px).
- **High-Density Archives**: The Memories gallery automatically shifts to a 5-column grid on tablets for professional-grade photo browsing.

---

## 🎲 Housie (Tambola) Module
A state-of-the-art, real-time gaming engine optimized for performance and synchronization.
- **Smart Game Persistence**:
    - **Resume Hosting**: Hosts can reconnect to a live game and instantly resume control without losing progress.
    - **Join State Sync**: Late-joining members are automatically synced to the current number and their previous ticket markings.
- **Real-Time Gameplay**:
    - **Socket.io Sync**: Ultra-low latency broadcast of called numbers and prize claims.
    - **Interactive Tickets**: Adaptive 9x3 ticket grids with haptic feedback and real-time validation.
- **Advanced Lobby Logic**:
    - **Lobby Persistence**: Last game leaderboards remain visible while new games are being staged.
    - **Duplicate Prevention**: Backend-level safeguards ensure one active game per Mandali.
    - **Cancellation Handling**: Robust cleanup logic to ensure database integrity if a game is abandoned.

---

## 📸 Memories & Digital Scrapbook
A shared space for reliving group moments with intelligent filtering.
- **"On This Day" Highlights**: Automatically surfaces memories from the same date in previous years for a cinematic nostalgia experience.
- **Smart Grouping**: Photos are intuitively grouped by Month and Year with high-fidelity headers.
- **Multi-Photo Stories**: Supports uploading multiple images per memory with rich descriptions.
- **Unified Gallery**: A responsive 3-column (mobile) or 5-column (tablet) grid layout with smooth transitions.

---

## 🤝 Group & Member Ecosystem
The backbone of the application for private circle coordination.
- **Seamless Onboarding**: 8-character invite codes with deep-link support to automatically join Mandalis.
- **Role-Based Views**: Dynamic UI adjustments for Admins/Hosts versus Members.
- **Member Directory**: Scaled avatar lists and member stats for easy group overview.
- **Create & Invite**: Streamlined, high-fidelity form flows for spinning up new digital circles.

---

## 📊 Hisaab (Expense Management)
Simplified group finance and settlement engine.
- **Expense Entries**: Quickly log shared costs with categorical tracking.
- **Intelligent Settlements**: Automated calculation of group balances and "who owes whom."

---

## 🛠️ Technical Infrastructure

### Core Stack
- **Frontend**: React Native (Expo) - TypeScript.
- **Styling**: Tailwind CSS (NativeWind) with a custom Design System for Tablet/Mobile parity.
- **Backend Engine**: Node.js / Express / Socket.io.
- **Data Layer**: Supabase (PostgreSQL) for relational data and real-time subscriptions.
- **Notifications**: Expo Notification Service with payload-driven deep linking.

### State & Sync
- **Zustand**: Global application state and authentication.
- **React Query**: Optimized server-state caching, invalidation, and background fetching.
- **Socket.io Rooms**: Encapsulated 'Mandali Rooms' for private, real-time event broadcasting.

---

## 🚀 Recent Improvements & Bug Fixes
- **FK Constraint Fixes**: Resolved critical `hous_games_cancelled_by_fkey` errors in Supabase.
- **Resume Logic**: Fixed UI issues where hosts were seeing "Host a Game" instead of "Resume Hosting" for existing live sessions.
- **Tablet Sizing**: Standardized `isTablet` detection to fix button width inconsistencies and font readability on iPad.
- **Navigation Guard**: Fixed a loop issue where users could get stuck between the Lobby and Last Leaderboard screens.
