# AirBoss UI Components

This folder is the start of extracting live UI behavior out of `index.html`.

## Current approach
Because AirBoss is intentionally staying local-first and build-system-light for now,
UI extraction is happening in stages:

1. preserve live behavior in the HTML app
2. create exact reference copies for extraction targets
3. define prop contracts
4. move components out one by one
5. wire them back in safely

## Current extraction target
- `OrderCard`
