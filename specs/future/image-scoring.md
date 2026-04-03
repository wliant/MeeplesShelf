# Image-Based Scoring

## Overview

Allow users to take a photo of the physical game board at the end of a game and use AI vision to automatically analyze the board state and compute scores for each player.

## Requirements

### Image Capture

- User can upload or capture a photo of the game board when logging a session
- Supported formats: common image types (JPEG, PNG, etc.)

### AI Board Analysis

- An AI vision model analyzes the photo of the game board
- The model identifies the board state relevant to scoring (e.g., settlements, territories, tokens, cards)
- The model computes scores per player based on the game's scoring specification
- Analysis is game-aware: the system uses the game's scoring spec to know what to look for on the board

### Score Population

- Computed scores are automatically populated into the session's score entry fields
- Users can review and adjust AI-computed scores before saving
- This supplements manual score entry — users can still enter scores by hand if preferred

### Constraints

- Accuracy depends on photo quality and board clarity
- Should support the games already in the system (Catan, Dominion, Five Tribes, War Chest) as initial targets
- The AI model must understand each game's visual layout and scoring rules
