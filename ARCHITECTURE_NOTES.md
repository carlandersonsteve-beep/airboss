# Architecture Notes

## Current Setup
- Single-file React app running via CDN and Babel in-browser
- No build system
- Data stored in localStorage
- Some Google Sheets / Forms integration

## Known Constraints
- Not multi-user safe
- Not production-grade persistence
- Hard to maintain as a single large file

## Intent
This will evolve into a structured application with:
- separated UI and logic
- better data handling
- clearer workflows
- improved reliability

## Important
Do not over-engineer early.
Focus on clarity, structure, and workflow first.