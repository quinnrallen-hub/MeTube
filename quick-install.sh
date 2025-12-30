#!/bin/bash

# MeTube One-Line Installer
# Usage: curl -fsSL https://raw.githubusercontent.com/quinnrallen-hub/MeTube/main/quick-install.sh | bash

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

APP_NAME="MeTube"
APP_EXEC="metube"
INSTALL_DIR="$HOME/.local/bin"
DESKTOP_DIR="$HOME/.local/share/applications"
ICON_DIR="$HOME/.local/share/icons/hicolor/512x512/apps"
TEMP_DIR="/tmp/metube-install-$$"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   MeTube Quick Install${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check dependencies
echo -e "${BLUE}Checking dependencies...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed.${NC}"
    echo "Please install Node.js first:"
    echo "  Arch/Manjaro: sudo pacman -S nodejs npm"
    echo "  Ubuntu/Debian: sudo apt install nodejs npm"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed.${NC}"
    exit 1
fi

if ! command -v git &> /dev/null; then
    echo -e "${RED}Error: git is not installed.${NC}"
    exit 1
fi

# Create temp directory
mkdir -p "$TEMP_DIR"
cd "$TEMP_DIR"

# Clone repository
echo -e "${BLUE}Downloading MeTube...${NC}"
git clone --depth 1 https://github.com/quinnrallen-hub/MeTube.git .

# Install dependencies
echo -e "${BLUE}Installing dependencies...${NC}"
npm install --silent

# Build application
echo -e "${BLUE}Building application (this may take a minute)...${NC}"
npm run build:linux

# Check if build succeeded
if [ ! -f "dist/YouTube Ad-Free-1.0.0.AppImage" ]; then
    echo -e "${RED}Build failed. AppImage not found.${NC}"
    cd /
    rm -rf "$TEMP_DIR"
    exit 1
fi

# Create directories
echo -e "${BLUE}Installing to system...${NC}"
mkdir -p "$INSTALL_DIR"
mkdir -p "$DESKTOP_DIR"
mkdir -p "$ICON_DIR"

# Copy AppImage
cp "dist/YouTube Ad-Free-1.0.0.AppImage" "$INSTALL_DIR/$APP_EXEC"
chmod +x "$INSTALL_DIR/$APP_EXEC"

# Create desktop entry
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

# Update desktop database
if command -v update-desktop-database &> /dev/null; then
    update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true
fi

# Cleanup
cd /
rm -rf "$TEMP_DIR"

# Check if ~/.local/bin is in PATH
if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
    echo ""
    echo -e "${YELLOW}WARNING: $INSTALL_DIR is not in your PATH${NC}"
    echo "Add this line to your ~/.bashrc or ~/.zshrc:"
    echo -e "${BLUE}export PATH=\"\$HOME/.local/bin:\$PATH\"${NC}"
    echo ""
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   Installation Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "MeTube has been installed successfully!"
echo ""
echo "You can now:"
echo "  • Launch ${BLUE}MeTube${NC} from your application menu"
echo "  • Run '${BLUE}$APP_EXEC${NC}' from the terminal"
echo ""
echo -e "${BLUE}Enjoy ad-free YouTube! 🎉${NC}"
echo ""
