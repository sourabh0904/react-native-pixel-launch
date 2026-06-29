/**
 * PixelDialog — custom dialog that replaces native Alert.
 *
 * Animation math (identical to PixelLaunchContainer but for a centered card):
 *   The dialog card sits at screen-center when untransformed.
 *   OX = originCX − SCREEN_W/2,  OY = originCY − SCREEN_H/2
 *   translateX: OX*(1−initialScale) → 0   (dialog centre moves from origin to screen centre)
 *   translateY: OY*(1−initialScale) → 0
 *   scale:      initialScale       → 1
 *
 * transform + opacity → native thread.
 * Backdrop fade       → native thread.
 */

import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { LaunchOrigin } from "./PixelLaunchContainer";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const DIALOG_W    = Math.min(SCREEN_W - 48, 320);
const INITIAL_S   = 0.06;

export type PixelDialogButton = {
  label: string;
  /** "default" = primary blue  |  "cancel" = gray  |  "destructive" = red */
  style?: "default" | "cancel" | "destructive";
  color?: string;
  icon?: React.ReactNode;
  onPress: () => void;
};

export type PixelDialogProps = {
  visible: boolean;
  /** Screen-absolute rect of the element that triggered this dialog. */
  origin: LaunchOrigin | null;
  title: string;
  message?: string;
  /** Optional icon rendered above the title. Pass any React node. */
  icon?: React.ReactNode;
  buttons: PixelDialogButton[];
  /** Called when the backdrop is tapped. */
  onDismiss?: () => void;
};

export function PixelDialog({
  visible,
  origin,
  title,
  message,
  icon,
  buttons,
  onDismiss,
}: PixelDialogProps) {
  const progress     = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted]           = useState(false);
  const [activeOrigin, setActiveOrigin] = useState<LaunchOrigin | null>(null);
  const hasOpenedRef = useRef(false);

  const btnScales = useRef(
    buttons.map(() => new Animated.Value(1))
  ).current;

  useEffect(() => {
    if (visible && origin) {
      hasOpenedRef.current = true;
      setActiveOrigin(origin);
      setMounted(true);
      progress.setValue(0);
      Animated.spring(progress, {
        toValue: 1,
        tension: 320,
        friction: 24,
        useNativeDriver: true,
      }).start();
    } else if (!visible && hasOpenedRef.current) {
      Animated.spring(progress, {
        toValue: 0,
        tension: 420,
        friction: 34,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          hasOpenedRef.current = false;
          setMounted(false);
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
    outputRange: [INITIAL_S, 1],
  });
  const translateX = progress.interpolate({
    inputRange:  [0, 1],
    outputRange: [OX * (1 - INITIAL_S), 0],
  });
  const translateY = progress.interpolate({
    inputRange:  [0, 1],
    outputRange: [OY * (1 - INITIAL_S), 0],
  });
  const backdropOpacity = progress.interpolate({
    inputRange:  [0, 1],
    outputRange: [0, 0.55],
  });
  const cardOpacity = progress.interpolate({
    inputRange:  [0, 0.06, 1],
    outputRange: [0, 1, 1],
  });

  const makePressIn  = (i: number) => () =>
    Animated.spring(btnScales[i], { toValue: 0.93, tension: 600, friction: 20, useNativeDriver: true }).start();
  const makePressOut = (i: number) => () =>
    Animated.spring(btnScales[i], { toValue: 1,    tension: 380, friction: 22, useNativeDriver: true }).start();

  const btnTextStyle = (btn:PixelDialogButton) => {
    // if (style === "destructive") return [styles.btnText, styles.btnDestructive];
    // if (style === "cancel")      return [styles.btnText, styles.btnCancel];
    if(btn.color) return [styles.btnText , {color: btn.color}];
    if(btn.style === 'destructive') return [styles.btnText, styles.btnDestructive];
    if(btn.style === 'cancel') return [styles.btnText, styles.btnCancel];
    return [styles.btnText, styles.btnDefault];
  };

  return (
    <View style={[StyleSheet.absoluteFill, styles.root]} pointerEvents="box-none">
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: "#000", opacity: backdropOpacity }]}
        onStartShouldSetResponder={() => { onDismiss?.(); return true; }}
      />

      <View style={styles.centre} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.card,
            {
              opacity: cardOpacity,
              transform: [{ translateX }, { translateY }, { scale }],
            },
          ]}
        >
          {icon && (
            <View style={styles.iconWrap}>
              {icon}
            </View>
          )}

          <Text style={styles.title}>{title}</Text>

          {message ? <Text style={styles.message}>{message}</Text> : null}

          <View style={styles.divider} />

          <View style={styles.btnRow}>
            {buttons.map((btn, i) => (
              <React.Fragment key={i}>
                {i > 0 && <View style={styles.btnSep} />}
                <Animated.View style={[styles.btnFlex, { transform: [{ scale: btnScales[i] }] }]}>
                  <TouchableOpacity
                    activeOpacity={1}
                    style={styles.btn}
                    onPressIn={makePressIn(i)}
                    onPressOut={makePressOut(i)}
                    onPress={btn.onPress}
                  >
                    {/* <Text style={btnTextStyle(btn)}>{btn.label}</Text> */}
                    <View style={{ flexDirection: 'row' , alignItems: 'center', gap : 6}}>
                      {btn.icon}
                      <Text style={btnTextStyle(btn)}>{btn.label}</Text>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              </React.Fragment>
            ))}
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    zIndex: 999,
    elevation: 999,
  },
  centre: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: DIALOG_W,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingTop: 28,
    paddingHorizontal: 0,
    paddingBottom: 0,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
    overflow: "hidden",
  },
  iconWrap: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.3,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  message: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 21,
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 24,
    paddingBottom: 4,
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    width: "100%",
    marginTop: 24,
  },
  btnRow: {
    flexDirection: "row",
    width: "100%",
  },
  btnFlex: {
    flex: 1,
  },
  btn: {
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  btnSep: {
    width: 1,
    backgroundColor: "#F3F4F6",
  },
  btnText: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.1,
  },
  btnDefault: {
    color: "#2563EB",
  },
  btnCancel: {
    color: "#6B7280",
    fontWeight: "500",
  },
  btnDestructive: {
    color: "#EF4444",
    fontWeight: "700",
  },
});
