import React from "react";
export type LaunchOrigin = {
    x: number;
    y: number;
    width: number;
    height: number;
};
export interface PixelLaunchContainerProps {
    /** Controls visibility — drives open/close animation. */
    visible: boolean;
    /** Screen-absolute rect of the element this overlay expands from. */
    origin: LaunchOrigin | null;
    /** Called when the user wants to close (e.g. back button). */
    onClose: () => void;
    /** Called after the close animation fully completes — safe to navigate here. */
    onDismissed?: () => void;
    /** Background colour of the overlay. Defaults to "#FFFFFF". */
    backgroundColor?: string;
    children: React.ReactNode;
}
/**
 * Pixel-Launcher-style overlay: scales up from an origin rect to fill the
 * screen, and collapses back on close.
 *
 * Transform math (true "scale from origin"):
 *   Every point p transforms as: p' = s·p + (OX, OY)·(1−s)
 *   At s=0  → all points collapse to the origin center.
 *   At s=1  → overlay fills the screen.
 *
 * transform + opacity  → native thread (useNativeDriver: true, 60/120 Hz).
 * borderRadius         → JS thread, starts at SCREEN_W/2 (circle) and
 *                        collapses to 0 as the overlay opens.
 */
export declare function PixelLaunchContainer({ visible, origin, onClose: _onClose, onDismissed, backgroundColor, children, }: PixelLaunchContainerProps): React.JSX.Element | null;
