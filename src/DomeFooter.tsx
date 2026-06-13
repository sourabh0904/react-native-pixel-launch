/**
 * DomeFooter — SVG dome bar + FAB menu system.
 *
 * A generic, theme-agnostic footer with a circular cutout (dome) for a
 * floating action button. Pair with <FabMenu> for an expandable menu.
 *
 * Pass `primaryColor` and `footerColor` as props — no theme context required.
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
import Svg, { Path } from "react-native-svg";

const { width: SCREEN_W } = Dimensions.get("window");

// ─── Layout constants (exported so screens can compute offsets / origins) ─────

export const FOOTER_BAR_H = 56;
export const DOME_R       = 50;
export const DOME_CX      = SCREEN_W - 58;
export const BTN_R        = 30;
export const CUP_RIM_R    = BTN_R + 9;

// ─── Internal SVG background ──────────────────────────────────────────────────

function FooterSvgBg({ extraH, footerColor }: { extraH: number; footerColor: string }) {
  const barH = FOOTER_BAR_H + extraH;

  const rect = [
    `M 0 0`,
    `L ${SCREEN_W} 0`,
    `L ${SCREEN_W} ${barH}`,
    `L 0 ${barH}`,
    `Z`,
  ].join(" ");

  const circle = [
    `M ${DOME_CX + CUP_RIM_R} 0`,
    `A ${CUP_RIM_R} ${CUP_RIM_R} 0 1 0 ${DOME_CX - CUP_RIM_R} 0`,
    `A ${CUP_RIM_R} ${CUP_RIM_R} 0 1 0 ${DOME_CX + CUP_RIM_R} 0`,
    `Z`,
  ].join(" ");

  return (
    <Svg
      width={SCREEN_W}
      height={barH}
      style={{ position: "absolute", bottom: 0, left: 0, backgroundColor: "transparent" }}
    >
      <Path d={`${rect} ${circle}`} fill={footerColor} fillRule="evenodd" />
    </Svg>
  );
}

// ─── FAB Menu ─────────────────────────────────────────────────────────────────

export type FabMenuItem = {
  key: string;
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
};

export type FabMenuProps = {
  isOpen: boolean;
  bottomOffset: number;
  primaryColor: string;
  items: FabMenuItem[];
  onClose: () => void;
};

export function FabMenu({
  isOpen,
  bottomOffset,
  primaryColor,
  items,
  onClose,
}: FabMenuProps) {
  const FAB_ITEM_SPACING = 72;
  const FAB_BASE_OFFSET  = 0;

  const backdropAnim = useRef(new Animated.Value(0)).current;
  const itemAnims    = useRef(items.map(() => new Animated.Value(0))).current;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      itemAnims.forEach((a) => a.setValue(0));

      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 0.55,
          duration: 130,
          useNativeDriver: true,
        }),
        Animated.stagger(
          30,
          itemAnims.map((a) =>
            Animated.spring(a, {
              toValue: 1,
              tension: 460,
              friction: 30,
              useNativeDriver: true,
            })
          )
        ),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 140,
          useNativeDriver: true,
        }),
        Animated.stagger(
          20,
          [...itemAnims].reverse().map((a) =>
            Animated.spring(a, {
              toValue: 0,
              tension: 550,
              friction: 38,
              useNativeDriver: true,
            })
          )
        ),
      ]).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [isOpen]);

  if (!mounted) return null;

  return (
    <View
      style={{
        position: "absolute",
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 500,
        elevation: 500,
      }}
      pointerEvents="box-none"
    >
      <Animated.View
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "#000",
          opacity: backdropAnim,
        }}
        pointerEvents="auto"
      >
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      {items.map((item, i) => {
        const offsetY       = bottomOffset + BTN_R * 2 + FAB_BASE_OFFSET + FAB_ITEM_SPACING * i;
        const distanceToBtn = offsetY - (bottomOffset - BTN_R);

        const translateY = itemAnims[i].interpolate({
          inputRange:  [0, 1],
          outputRange: [distanceToBtn, 0],
        });
        const scale = itemAnims[i].interpolate({
          inputRange:  [0, 0.5, 1],
          outputRange: [0.2, 1.08, 1],
        });
        const opacity = itemAnims[i].interpolate({
          inputRange:  [0, 0.15, 1],
          outputRange: [0, 1, 1],
        });

        return (
          <Animated.View
            key={item.key}
            style={[
              styles.fabItem,
              { bottom: offsetY, opacity, transform: [{ translateY }, { scale }] },
            ]}
          >
            <View style={[styles.fabLabel, { borderColor: primaryColor }]}>
              <Text style={[styles.fabLabelText, { color: primaryColor }]}>
                {item.label}
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.fabItemBtn,
                { backgroundColor: primaryColor, shadowColor: primaryColor },
              ]}
              onPress={item.onPress}
            >
              {item.icon}
            </TouchableOpacity>
          </Animated.View>
        );
      })}
    </View>
  );
}

// ─── Footer bar ───────────────────────────────────────────────────────────────

export type DomeFooterProps = {
  /** Total bar height = FOOTER_BAR_H + safe-area bottom inset */
  barH: number;
  /** Primary (brand) colour for the FAB button */
  primaryColor: string;
  /** Footer bar background colour */
  footerColor: string;
  /** Brand text shown on the footer bar. Defaults to empty string. */
  brandText?: string;
  /** Sub-screen mode: show a back/close button instead of the FAB toggle. */
  onBack?: () => void;
  // Dashboard-only props (ignored when onBack is provided)
  isSheetOpen?: boolean;
  isFabOpen?: boolean;
  isMenuOpen?: boolean;
  onCloseSheet?: () => void;
  onToggleFab?: () => void;
  onCloseMenu?: () => void;
  /** Custom icon for the FAB button. Receives iconName ("menu" | "close") */
  renderIcon?: (iconName: "menu" | "close") => React.ReactNode;
};

export function DomeFooter({
  barH,
  primaryColor,
  footerColor,
  brandText = "",
  onBack,
  isSheetOpen = false,
  isFabOpen = false,
  isMenuOpen = false,
  onCloseSheet,
  onToggleFab,
  onCloseMenu,
  renderIcon,
}: DomeFooterProps) {
  const isOverlayOpen = isSheetOpen || isFabOpen || isMenuOpen;

  function handlePress() {
    if (onBack) return onBack();
    if (isSheetOpen) return onCloseSheet?.();
    if (isMenuOpen)  return onCloseMenu?.();
    onToggleFab?.();
  }

  const iconName: "menu" | "close" = onBack ? "close" : isOverlayOpen ? "close" : "menu";

  return (
    <View
      style={{
        height: barH + BTN_R,
        marginTop: -BTN_R,
        zIndex: 9999,
        elevation: 9999,
      }}
    >
      <FooterSvgBg extraH={barH - FOOTER_BAR_H} footerColor={footerColor} />
      <TouchableOpacity
        activeOpacity={0.85}
        style={[styles.footerMenuBtn, { backgroundColor: primaryColor }]}
        onPress={handlePress}
      >
        {renderIcon ? renderIcon(iconName) : (
          <Text style={{ color: "#FFF", fontSize: 20, fontWeight: "700" }}>
            {iconName === "menu" ? "☰" : "✕"}
          </Text>
        )}
      </TouchableOpacity>
      <View style={[styles.footerBar, { height: FOOTER_BAR_H }]}>
        {brandText ? (
          <Text style={[styles.footerBrand, { color: primaryColor }]}>
            {brandText}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  fabItem: {
    position: "absolute",
    right: SCREEN_W - DOME_CX - BTN_R,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 31,
    gap: 10,
  },
  fabLabel: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 5,
    borderWidth: 1.5,
  },
  fabLabelText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  fabItemBtn: {
    width: BTN_R * 2,
    height: BTN_R * 2,
    borderRadius: BTN_R,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },

  footerMenuBtn: {
    position: "absolute",
    top: 0,
    right: SCREEN_W - DOME_CX - BTN_R,
    width: BTN_R * 2,
    height: BTN_R * 2,
    borderRadius: BTN_R,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
  },
  footerBar: {
    position: "absolute",
    top: BTN_R,
    left: 0,
    right: 0,
    paddingLeft: 20,
    paddingRight: BTN_R * 2 + 40,
    justifyContent: "center",
  },
  footerBrand: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
