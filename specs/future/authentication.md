# Authentication & Authorization

## Overview

The application requires user authentication with two access levels: Guest and Admin. This enables shared access to game data while restricting configuration to authorized users.

## Requirements

### Guest Access

- Users can enter the app without credentials by selecting "Login as Guest"
- Guest users have **read-only** access:
  - View game inventory (browse games, expansions, scoring specs)
  - View game sessions (browse session history, scores, winners)
- Guests **cannot**:
  - Add, edit, or delete games
  - Add or delete expansions
  - Log new game sessions
  - Manage players

### Admin Access

- Admin users authenticate with credentials
- Admin users have **full access**:
  - All guest permissions (view inventory and sessions)
  - Add, edit, and delete games
  - Manage expansions
  - Log and delete game sessions
  - Create and manage players
  - Seed default games
  - Configure scoring specifications

## Roles Summary

| Action                  | Guest | Admin |
|-------------------------|-------|-------|
| View game inventory     | Yes   | Yes   |
| View game sessions      | Yes   | Yes   |
| Add/edit/delete games   | No    | Yes   |
| Manage expansions       | No    | Yes   |
| Log game sessions       | No    | Yes   |
| Manage players          | No    | Yes   |
| Seed default games      | No    | Yes   |
