import React, { useEffect, useRef, useState } from "react";
import { Animated, Dimensions } from "react-native";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

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
export function PixelLaunchContainer({
  visible,
  origin,
  onClose: _onClose,
  onDismissed,
  backgroundColor = "#FFFFFF",
  children,
}: PixelLaunchContainerProps) {
  const progress   = useRef(new Animated.Value(0)).current;
  const radiusAnim = useRef(new Animated.Value(SCREEN_W / 2)).current;

  const [mounted, setMounted]           = useState(false);
  const [activeOrigin, setActiveOrigin] = useState<LaunchOrigin | null>(null);
  const hasOpenedRef                    = useRef(false);

  useEffect(() => {
    if (visible && origin) {
      hasOpenedRef.current = true;
      setActiveOrigin(origin);
      setMounted(true);
      progress.setValue(0);
      radiusAnim.setValue(SCREEN_W / 2);

      Animated.parallel([
        Animated.spring(progress, {
          toValue: 1,
          tension: 200,
          friction: 16,
          useNativeDriver: true,
        }),
        Animated.spring(radiusAnim, {
          toValue: 0,
          tension: 160,
          friction: 18,
          useNativeDriver: false,
        }),
      ]).start();

    } else if (!visible && hasOpenedRef.current) {
      Animated.parallel([
        Animated.spring(progress, {
          toValue: 0,
          tension: 280,
          friction: 28,
          useNativeDriver: true,
        }),
        Animated.spring(radiusAnim, {
          toValue: SCREEN_W / 2,
          tension: 240,
          friction: 28,
          useNativeDriver: false,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          hasOpenedRef.current = false;
          setMounted(false);
          onDismissed?.();
        }
      });
    }
  }, [visible]);

  if (!mounted || !activeOrigin) return null;

  const originCX = activeOrigin.x + activeOrigin.width  / 2;
  const originCY = activeOrigin.y + activeOrigin.height / 2;
  const OX       = originCX - SCREEN_W / 2;
  const OY       = originCY - SCREEN_H / 2;

  const scale = progress.interpolate({
    inputRange:  [0, 1],
    outputRange: [0, 1],
  });

  const translateX = progress.interpolate({
    inputRange:  [0, 1],
    outputRange: [OX, 0],
  });
  const translateY = progress.interpolate({
    inputRange:  [0, 1],
    outputRange: [OY, 0],
  });

  const opacity = progress.interpolate({
    inputRange:  [0, 0.05, 1],
    outputRange: [0, 1,    1],
    extrapolate: "clamp",
  });

  return (
    <Animated.View
      style={[{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }, { zIndex: 200, elevation: 200, opacity }]}
    >
      <Animated.View
        style={{ flex: 1, transform: [{ translateX }, { translateY }, { scale }] }}
      >
        <Animated.View
          style={{
            flex: 1,
            backgroundColor,
            borderRadius: radiusAnim,
            overflow: "hidden",
          }}
        >
          {children}
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}
