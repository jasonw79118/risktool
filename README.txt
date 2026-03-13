Risk Manager – Phase 5.4a Random Outcomes XLS Correction

This correction fixes the Random Outcomes export so it truly downloads as an XLS file.

What changed:
- the Random Outcomes button is forcibly rebound to XLS export logic
- any older TXT click handlers are removed by replacing the button node at startup
- the export writes SpreadsheetML content with an .xls filename
- one row is created for each randomized Monte Carlo scenario

Use this correction on top of the Phase 5.4 baseline.
