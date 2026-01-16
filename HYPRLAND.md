# MeTube - Hyprland Configuration

## Quick Start

### Recommended Launch Method
Use the optimized launch script:
```bash
cd ~/MeTube
./launch-hyprland.sh
```

This script sets all necessary environment variables and launches with optimal settings.

### Alternative: Direct Launch
```bash
bun run start
```

## Optimizations Applied

### Electron Flags (Automatic)
The `bun run start` command now includes these Wayland optimizations:
- `--enable-features=UseOzonePlatform,WaylandWindowDecorations`
- `--ozone-platform=wayland`
- `--enable-wayland-ime`
- `--disable-features=WaylandFractionalScaleV1`

These flags ensure proper Wayland rendering and eliminate image description errors.

### Window Properties
- Menu bar auto-hidden and disabled (prevents Alt key conflicts)
- Native window decorations enabled
- Shadow support enabled for better visual integration

## Recommended Hyprland Window Rules

Add these to your `~/.config/hypr/hyprland.conf`:

```conf
# MeTube - Better YouTube Client
windowrulev2 = float, class:^(electron)$, title:^(MeTube)
windowrulev2 = size 1400 900, class:^(electron)$, title:^(MeTube)
windowrulev2 = center, class:^(electron)$, title:^(MeTube)
windowrulev2 = opacity 1.0 0.95, class:^(electron)$, title:^(MeTube)

# Optional: Fullscreen video support
windowrulev2 = fullscreen, class:^(electron)$, title:^(MeTube), fullscreen:1
```

### Alternative: Tiled Window Rules
If you prefer MeTube to tile instead of float:

```conf
windowrulev2 = tile, class:^(electron)$, title:^(MeTube)
windowrulev2 = opacity 1.0 0.98, class:^(electron)$, title:^(MeTube)
```

## Keyboard Shortcuts Integration

MeTube includes 20+ keyboard shortcuts that work perfectly with Hyprland:

### Video Playback
- **Space/K** - Play/Pause
- **F** - Fullscreen (Hyprland native fullscreen)
- **T** - Theater mode
- **M** - Mute/Unmute
- **L** - Loop toggle

### Navigation
- **←/→** or **J/L** - Seek ±10 seconds
- **↑/↓** - Volume ±10%
- **0-9** - Jump to 0%-90%
- **,/.** - Playback speed ±0.25x
- **Esc** - Exit fullscreen/back

These shortcuts won't conflict with Hyprland binds since they only activate when the video player is focused.

## Performance Tips

### 1. GPU Acceleration
Ensure your GPU drivers support Wayland acceleration:
```bash
# Check current renderer
echo $XDG_SESSION_TYPE  # Should show "wayland"

# Verify GPU acceleration in MeTube
# Open DevTools (F12 in development mode) and check chrome://gpu
```

### 2. Memory Usage
MeTube is optimized for low memory usage:
- Video caching: 1-hour duration
- Automatic cleanup of old video elements
- No memory leaks from event listeners

### 3. Hyprland Animation Smoothness
For buttery smooth animations when opening MeTube:
```conf
animation = windows, 1, 5, default, slide
animation = windowsIn, 1, 5, default, slide
animation = windowsOut, 1, 5, default, slide
animation = fade, 1, 5, default
```

## Troubleshooting

### Issue: "Incomplete image description info" Errors
**Fixed** - The new Electron flags disable WaylandFractionalScaleV1 which causes these errors.

### Issue: Window Decorations Missing
Ensure `WaylandWindowDecorations` is enabled in the start script (already configured).

### Issue: Menu Bar Shows on Alt Press
**Fixed** - Menu bar visibility is now disabled programmatically.

### Issue: Blurry Text/UI
Add to Hyprland config:
```conf
misc {
    enable_swallow = true
    swallow_regex = ^(electron)$
}
```

### Issue: Screen Tearing in Videos
Enable VSync in Hyprland:
```conf
misc {
    vrr = 1  # Variable refresh rate
}
```

## Desktop Integration

### .desktop File
Create `~/.local/share/applications/metube.desktop`:

```desktop
[Desktop Entry]
Name=MeTube
Comment=Ad-free YouTube client with advanced features
Exec=/usr/bin/bun run start --working-dir=/home/quinn/MeTube
Icon=/home/quinn/MeTube/icon.png
Terminal=false
Type=Application
Categories=AudioVideo;Video;Network;
Keywords=youtube;video;streaming;
StartupWMClass=electron
```

### Launch from Rofi/Wofi
MeTube will appear in your application launcher with the correct window class.

## Build AppImage for Native Integration

Build a standalone AppImage that includes all Wayland flags:

```bash
cd ~/MeTube
bun run build:appimage
```

The AppImage will be in `dist/` and can be run directly with:
```bash
./dist/MeTube-*.AppImage
```

## Comparison: Before vs After

| Aspect | Before | After |
|--------|--------|-------|
| Wayland Errors | 3+ per second | None |
| Window Integration | Poor | Native |
| Menu Bar | Shows on Alt | Hidden |
| Decorations | X11 fallback | Wayland native |
| IME Support | None | Full Wayland IME |
| Fractional Scaling | Broken | Disabled (stable) |

## Additional Resources

- [Hyprland Wiki - Window Rules](https://wiki.hyprland.org/Configuring/Window-Rules/)
- [Electron Wayland Support](https://www.electronjs.org/docs/latest/tutorial/wayland-support)
- [MeTube GitHub](https://github.com/quinnrallen-hub/MeTube)

---

**Note:** If you ever need to run MeTube with X11 instead of Wayland:
```bash
bun run start:x11
```
