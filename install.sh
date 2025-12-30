#!/bin/bash

# MeTube Installation Script
# Installs the YouTube Ad-Free client to your system

set -e

APP_NAME="MeTube"
APP_EXEC="metube"
INSTALL_DIR="$HOME/.local/bin"
DESKTOP_DIR="$HOME/.local/share/applications"
ICON_DIR="$HOME/.local/share/icons/hicolor/512x512/apps"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   MeTube Installation${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if AppImage exists
if [ ! -f "dist/YouTube Ad-Free-1.0.0.AppImage" ]; then
    echo -e "${RED}Error: AppImage not found!${NC}"
    echo "Please run 'npm run build:linux' first."
    exit 1
fi

# Create directories if they don't exist
echo -e "${BLUE}Creating directories...${NC}"
mkdir -p "$INSTALL_DIR"
mkdir -p "$DESKTOP_DIR"
mkdir -p "$ICON_DIR"

# Copy AppImage
echo -e "${BLUE}Installing application...${NC}"
cp "dist/YouTube Ad-Free-1.0.0.AppImage" "$INSTALL_DIR/$APP_EXEC"
chmod +x "$INSTALL_DIR/$APP_EXEC"

# Create desktop entry
echo -e "${BLUE}Creating desktop entry...${NC}"
cat > "$DESKTOP_DIR/$APP_EXEC.desktop" << EOF
[Desktop Entry]
Name=MeTube
Comment=Ad-free YouTube client
Exec=$INSTALL_DIR/$APP_EXEC
Icon=$APP_EXEC
Terminal=false
Type=Application
Categories=AudioVideo;Video;Network;
Keywords=youtube;video;streaming;
StartupWMClass=MeTube
EOF

# Extract and save icon from AppImage (if possible)
if command -v convert &> /dev/null || command -v magick &> /dev/null; then
    echo -e "${BLUE}Extracting icon...${NC}"
    # Try to extract icon - this is a best effort
    "$INSTALL_DIR/$APP_EXEC" --appimage-extract usr/share/icons/hicolor/512x512/apps/*.png 2>/dev/null || true
    if ls squashfs-root/usr/share/icons/hicolor/512x512/apps/*.png 1> /dev/null 2>&1; then
        cp squashfs-root/usr/share/icons/hicolor/512x512/apps/*.png "$ICON_DIR/$APP_EXEC.png"
        rm -rf squashfs-root
    fi
fi

# Update desktop database
if command -v update-desktop-database &> /dev/null; then
    echo -e "${BLUE}Updating desktop database...${NC}"
    update-desktop-database "$DESKTOP_DIR"
fi

# Update icon cache
if command -v gtk-update-icon-cache &> /dev/null; then
    echo -e "${BLUE}Updating icon cache...${NC}"
    gtk-update-icon-cache -f -t "$HOME/.local/share/icons/hicolor" 2>/dev/null || true
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   Installation Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "MeTube has been installed to: ${BLUE}$INSTALL_DIR/$APP_EXEC${NC}"
echo ""
echo "You can now:"
echo "  • Launch from your application menu"
echo "  • Run '${BLUE}$APP_EXEC${NC}' from the terminal"
echo ""
echo -e "${BLUE}Enjoy ad-free YouTube! 🎉${NC}"
echo ""
