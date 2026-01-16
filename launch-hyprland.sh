#!/bin/bash
# MeTube Launch Script for Hyprland
# This script sets optimal environment variables and launches MeTube

# Wayland/Hyprland environment variables
export ELECTRON_OZONE_PLATFORM_HINT=wayland
export ELECTRON_ENABLE_WAYLAND=1
export GDK_BACKEND=wayland
export QT_QPA_PLATFORM=wayland
export SDL_VIDEODRIVER=wayland
export _JAVA_AWT_WM_NONREPARENTING=1

# Suppress Wayland image description warnings
export ELECTRON_LOG_LEVEL=3

# GPU acceleration
export LIBVA_DRIVER_NAME=radeonsi  # Change to your GPU driver (intel, nvidia, etc.)

# Launch MeTube
cd "$(dirname "$0")"
exec bun run start
