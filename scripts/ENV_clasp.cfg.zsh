#!/bin/zsh
# scripts/ENV_clasp.cfg.zsh
# ------------------------------------------------------------------------------------
# Template for clasp.zsh configuration files. Tracked in git - placeholder values only, no real secrets.
# To create a real profile, copy this file to scripts/<PREFIX>_clasp.cfg.zsh (gitignored via
# scripts/*_clasp.cfg.zsh - never committed) and fill in real values, then load it with either:
#   zsh scripts/clasp.zsh <pull|push|deploy> --env <PREFIX>
#   zsh scripts/clasp.zsh <pull|push|deploy> --file <PREFIX>_clasp.cfg.zsh
# All three fields are required regardless of command - pull/push only use SCRIPT_ID, but the file is
# validated as a whole. See docs/TechnicalArchitecture.md ("Local Clasp Configuration") for details.
# ------------------------------------------------------------------------------------
SCRIPT_ID="your Apps Script project's scriptId"
DEPLOYMENT_ID="your Web app's deploymentId"
DEPLOYMENT_NAME="your deployment description"
