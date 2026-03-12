Risk Manager – Phase 4.3 Surgical Upgrade Package

Baseline used:
- Phase 4.2 package layout and behavior
- Preserved sidebar / topbar / dashboard shell
- Preserved dashboard graph, report graph, Monte Carlo table options, saved scenarios flow, and complex risk item handling

This package updates:
- removes Evaluation Type from builders
- removes visible ? from hover-help labels and uses dotted underline
- adds Product Group Name
- adds Risk Domain to both builders
- adds Scenario Status
- adds Scenario Source
- adds Risk Acceptance Authority
- adds repeatable Mitigation Factors sections
- adds Accepted Risk governance sections
- expands Saved Scenarios into a scenario table with filters
- keeps browser-local saved scenarios and migrates legacy local data where possible

Important note on uploads:
- because this remains a browser-local GitHub Pages prototype, uploaded files are represented as filename metadata in saved scenarios
- binary file contents are not persisted in localStorage
