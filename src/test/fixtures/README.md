# GPX fixtures

Trimmed, anonymised windows of real Garmin Connect exports. `<metadata>` is removed, track names are replaced, and each window is cut from the middle of the activity, away from its start and end. Raw recordings live in the gitignored `GpxFiles/` folder and are never committed.

| File              | Source                 | Points | Segments | Fields                                                                         |
| ----------------- | ---------------------- | -----: | -------: | ------------------------------------------------------------------------------ |
| `run.gpx`         | Garmin run export      |    150 |        1 | `ele`, `time`, HR, cadence, air temp (`ns3:TrackPointExtension`)               |
| `bike.gpx`        | Garmin cycling export  |    200 |        2 | `ele`, `time`, HR, air temp; segments split at a real 177 s pause (700 m jump) |
| `no-ele-time.gpx` | Garmin cycling export  |     80 |        1 | `lat`/`lon` only                                                               |
| `run-b.gpx`       | Derived from `run.gpx` |    130 |        1 | `ele`, `time`, HR, air temp; no cadence                                        |

`run-b.gpx` is a synthetic "second run" of the `run.gpx` route, for comparing two tracks: its first 130 points, moved about 3 m north, two days later, with the times between points stretched by 10% (slower), HR + 5 bpm and cadence removed. It is derived from the committed `run.gpx` only.
