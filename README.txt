Risk Manager – Phase 5.4b Random Outcomes CSV Patch

This patch changes the Random Outcomes export from XLS to CSV.

Why:
- CSV is simpler and more reliable in the browser
- easier to verify row counts
- easier to open in Excel without SpreadsheetML issues

Included:
- Download Random Outcomes CSV button
- export rebuilt from the randomized scenario rows
- if the current summary is missing rows, the export regenerates them before download
- row count should match the selected Random Scenarios value
