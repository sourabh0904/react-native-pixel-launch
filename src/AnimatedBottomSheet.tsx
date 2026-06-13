/**
 * AnimatedBottomSheet
 *
 * Reusable bottom sheet that slides up from the bottom with a pixel-style
 * spring animation and collapses back on close.
 *
 * Provides StaggerContext so any <StaggerItem index={i}> inside will
 * animate in one-by-one when the sheet opens, and out in reverse when it closes.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Dimensions,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

const MAX_STAGGER_ITEMS = 15;
const STAGGER_IN_DELAY  = 40;
const STAGGER_OUT_DELAY = 25;

// ─── Stagger context ──────────────────────────────────────────────────────────

export const StaggerContext = createContext<Animated.Value[]>([]);

// ─── StaggerItem ──────────────────────────────────────────────────────────────

export type StaggerItemProps = {
  index:    number;
  children: React.ReactNode;
};

/**
 * Wrap each list row with this. Must be inside an <AnimatedBottomSheet>.
 * The `index` determines the stagger order.
 */
export function StaggerItem({ index, children }: StaggerItemProps) {
  const anims  = useContext(StaggerContext);
  const anim   = anims[index] ?? new Animated.Value(1);
  const slideY = anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] });
  return (
    <Animated.View style={{ opacity: anim, transform: [{ translateY: slideY }] }}>
      {children}
    </Animated.View>
  );
}

// ─── AnimatedBottomSheet ──────────────────────────────────────────────────────

export type AnimatedBottomSheetProps = {
  /** Controls open/close */
  visible:       boolean;
  /** Called when user taps backdrop or swipes down */
  onClose:       () => void;
  /** Optional header title */
  title?:        string;
  /** Distance from screen bottom (e.g. footer height) */
  bottomOffset?: number;
  /**
   * X position (from left) of the button that triggers the sheet.
   * The sheet will scale from this point. Defaults to screen center.
   */
  originX?:      number;
  /** Max sheet height as fraction of screen height (default 0.80) */
  maxHeightRatio?: number;
  /** Sheet background color. Defaults to "#FFFFFF". */
  backgroundColor?: string;
  /** Title text color. Defaults to "#111827". */
  titleColor?: string;
  /** Handle bar color. Defaults to "#E5E7EB". */
  handleColor?: string;
  /** Divider color. Defaults to "#F3F4F6". */
  dividerColor?: string;
  /** Backdrop opacity when fully open. Defaults to 0.45. */
  backdropMaxOpacity?: number;
  children?:     React.ReactNode;
};

export function AnimatedBottomSheet({
  visible,
  onClose,
  title,
  bottomOffset    = 0,
  originX: _originX,
  maxHeightRatio  = 0.80,
  backgroundColor = "#FFFFFF",
  titleColor      = "#111827",
  handleColor     = "#E5E7EB",
  dividerColor    = "#F3F4F6",
  backdropMaxOpacity = 0.45,
  children,
}: AnimatedBottomSheetProps) {
  const MAX_HEIGHT = SCREEN_H * maxHeightRatio;

  const [isVisible, setIsVisible] = useState(false);
  const prevVisible               = useRef(false);

  const slideAnim       = useRef(new Animated.Value(SCREEN_H)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const panY            = useRef(new Animated.Value(0)).current;

  const rowAnims = useRef(
    Array.from({ length: MAX_STAGGER_ITEMS }, () => new Animated.Value(0))
  ).current;

  const triggerRowsIn = () => {
    rowAnims.forEach(a => a.setValue(0));
    Animated.stagger(
      STAGGER_IN_DELAY,
      rowAnims.map(a =>
        Animated.spring(a, { toValue: 1, bounciness: 5, speed: 16, useNativeDriver: true })
      )
    ).start();
  };

  const triggerRowsOut = (onDone: () => void) => {
    Animated.stagger(
      STAGGER_OUT_DELAY,
      [...rowAnims].reverse().map(a =>
        Animated.timing(a, { toValue: 0, duration: 120, useNativeDriver: true })
      )
    ).start(onDone);
  };

  const openSheet = () => {
    slideAnim.setValue(SCREEN_H);
    panY.setValue(0);
    backdropOpacity.setValue(0);
    setIsVisible(true);
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue:    0,
        bounciness: 6,
        speed:      10,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue:  backdropMaxOpacity,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start();
    setTimeout(triggerRowsIn, 80);
  };

  const closeSheet = () => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue:    SCREEN_H,
        bounciness: 0,
        speed:      18,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue:  0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => {
      panY.setValue(0);
      setIsVisible(false);
    });
  };

  const closeFromGesture = () => {
    prevVisible.current = false;
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue:    SCREEN_H,
        bounciness: 0,
        speed:      20,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue:  0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      panY.setValue(0);
      setIsVisible(false);
      onClose();
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        gs.dy > 5 && Math.abs(gs.dy) > Math.abs(gs.dx),
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) panY.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > MAX_HEIGHT * 0.4) {
          closeFromGesture();
        } else {
          Animated.spring(panY, {
            toValue: 0,
            bounciness: 6,
            speed: 14,
            useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(panY, {
          toValue: 0,
          bounciness: 6,
          speed: 14,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  useEffect(() => {
    if (visible && !prevVisible.current) {
      prevVisible.current = true;
      openSheet();
    } else if (!visible && prevVisible.current) {
      prevVisible.current = false;
      triggerRowsOut(() => closeSheet());
    }
  }, [visible]);

  if (!isVisible) return null;

  // Combine slide + drag into one translateY
  const combinedTranslateY = Animated.add(slideAnim, panY);

  return (
    <StaggerContext.Provider value={rowAnims}>
      <View style={styles.container} pointerEvents="box-none">
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        </Animated.View>

        {/* Sheet */}
        <Animated.View
          style={[
            styles.sheet,
            {
              bottom: bottomOffset,
              maxHeight: MAX_HEIGHT,
              backgroundColor,
              transform: [{ translateY: combinedTranslateY }],
            },
          ]}
        >
          <View {...panResponder.panHandlers}>
            <View style={[styles.handle, { backgroundColor: handleColor }]} />
            {title ? (
              <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: titleColor }]}>{title}</Text>
              </View>
            ) : null}
          </View>

          <View style={[styles.divider, { backgroundColor: dividerColor }]} />

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </StaggerContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 500,
    elevation: 500,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#000",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 16,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  divider: {
    height: 1,
    marginHorizontal: 20,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
});
