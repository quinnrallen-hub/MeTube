#!/bin/bash

# MeTube Uninstall Script

set -e

APP_EXEC="metube"
INSTALL_DIR="$HOME/.local/bin"
DESKTOP_DIR="$HOME/.local/share/applications"
ICON_DIR="$HOME/.local/share/icons/hicolor/512x512/apps"

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${BLUE}Uninstalling MeTube...${NC}"
echo ""

# Remove files
rm -f "$INSTALL_DIR/$APP_EXEC"
rm -f "$DESKTOP_DIR/$APP_EXEC.desktop"
rm -f "$ICON_DIR/$APP_EXEC.png"

# Update desktop database
if command -v update-desktop-database &> /dev/null; then
    update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true
fi

# Update icon cache
if command -v gtk-update-icon-cache &> /dev/null; then
    gtk-update-icon-cache -f -t "$HOME/.local/share/icons/hicolor" 2>/dev/null || true
fi

echo -e "${GREEN}MeTube has been uninstalled.${NC}"
echo ""
