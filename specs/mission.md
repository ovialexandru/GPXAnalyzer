# Mission

## Purpose
A fast, private web app for exploring and analyzing GPX tracks: upload a file, then view it on a map and on linked charts, zoom in, and get stats for any selected segment.


## Users
Outdoor athletes recording tracks with a watch or phone: **runners, cyclists, kayakers, windsurfers**.

## Principles
1. **Private by default** – GPX files are parsed in the browser and never uploaded to a server.
2. **No accounts, no backend** – open the page, drop a file, analyze.
3. **Linked views** – map and charts always reflect the same hover position and selected range.
4. **Fast on large tracks** – tens of thousands of points should stay interactive.
5. **Mobile-friendly** – the app must be fully usable on phones: responsive layout, touch gestures for map and chart zoom/selection, tap-sized controls, and no horizontal page scroll.
5. **Small steps** – the app is always in a working, shippable state after each roadmap phase.

## Core capabilities
- **Map view** showing the track on an interactive, zoomable map.
- **Linked charts** (elevation, speed/pace, and heart rate/cadence when present) synced with the map.
- **Range selection stats** – zoom or brush a segment and see its distance, time, speed, and elevation gain/loss.

## Non-goals (v1)
- Social or sharing features (feeds, public links, comments).
- Accounts, cloud storage, or saved libraries.
- Route planning or track editing.
- Third-party integrations (Strava, Garmin) and other formats (FIT, TCX).
