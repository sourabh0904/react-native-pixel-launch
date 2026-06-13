/**
 * PixelMenuGrid — data-driven, categorized icon grid with scale-on-press
 * animation and LaunchOrigin measurement for PixelLaunchContainer.
 *
 * PixelMenuOverlay — search bar + grid combo.
 *
 * Both components are fully generic — no icon-library or theme dependencies.
 * Pass a `renderIcon` function to render icons however you like.
 */

import React, { useRef, useState } from "react";
import {
  Animated,
  Easing,
  Keyboard,
  LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import type { LaunchOrigin } from "./PixelLaunchContainer";

// ─── Named color map ─────────────────────────────────────────────────────────

const NAMED_COLOR_MAP: Record<string, string> = {
  red:    "#DC2626",
  orange: "#EA580C",
  yellow: "#D97706",
  green:  "#16A34A",
  teal:   "#0F766E",
  blue:   "#2563EB",
  indigo: "#4338CA",
  violet: "#7C3AED",
  purple: "#9333EA",
  pink:   "#DB2777",
  cyan:   "#0E7490",
  gray:   "#6B7280",
  grey:   "#6B7280",
  brown:  "#92400E",
  lime:   "#65A30D",
  amber:  "#B45309",
};

function resolveColor(
  color: string | undefined,
  fallback: string,
  customMap?: Record<string, string>,
): string {
  if (!color) return fallback;
  if (color.startsWith("#") || color.startsWith("rgb")) return color;
  return customMap?.[color.toLowerCase()]
    ?? NAMED_COLOR_MAP[color.toLowerCase()]
    ?? fallback;
}

// ─── Grouping utility (replaces lodash) ──────────────────────────────────────

function groupAndSort<T extends PixelMenuItem>(items: T[]): PixelMenuSection<T>[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const cat = item.category ?? "Other";
    const arr = groups.get(cat);
    if (arr) arr.push(item);
    else groups.set(cat, [item]);
  }
  return Array.from(groups.entries())
    .sort(([, a], [, b]) => (a[0]?.order ?? 999) - (b[0]?.order ?? 999))
    .map(([category, sectionItems]) => ({
      category,
      items: [...sectionItems].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    }));
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type PixelMenuItem = {
  /** Unique key for React keys and animation lookup */
  key: string;
  /** Display label under the icon */
  title: string;
  /** Color for the icon (hex or named color like "red") */
  color?: string;
  /** Category/section this item belongs to */
  category?: string;
  /** Sort order within a category (lower = earlier) */
  order?: number;
};

export type PixelMenuSection<T extends PixelMenuItem = PixelMenuItem> = {
  /** Section header label */
  category: string;
  /** Items in this section */
  items: T[];
};

export type PixelMenuIconRenderer<T extends PixelMenuItem = PixelMenuItem> = (
  item: T,
  resolvedColor: string,
  size: number,
) => React.ReactNode;

export type PixelMenuGridProps<T extends PixelMenuItem = PixelMenuItem> = {
  /** Flat list of items — auto-grouped by category and sorted by order */
  items?: T[];
  /** Pre-grouped sections — used as-is, ignores items prop */
  sections?: PixelMenuSection<T>[];
  /** Render the icon for each card. Receives item, resolved color, and icon size. */
  renderIcon: PixelMenuIconRenderer<T>;
  /** Called when a card is pressed with measured screen position. */
  onItemPress?: (item: T, origin: LaunchOrigin) => void;
  /** Current search term (controlled). Filters items by title. */
  searchTerm?: string;
  /** Primary accent color for section headers. Defaults to "#2563EB". */
  primaryColor?: string;
  /** Color for section divider rule. Defaults to primaryColor at 50% opacity. */
  ruleColor?: string;
  /** Background color of the icon circle. Defaults to "#FFFFFF". */
  iconCircleColor?: string;
  /** Card label text color. Defaults to "#1F2937". */
  labelColor?: string;
  /** Number of columns. Defaults to 4. */
  columns?: number;
  /** Icon circle diameter in px. Defaults to 64. */
  iconSize?: number;
  /** Icon render size inside circle. Defaults to 32. */
  iconRenderSize?: number;
  /** Gap between cards in px. Defaults to 12. */
  cardGap?: number;
  /** Horizontal padding of the grid. Defaults to 16. */
  horizontalPadding?: number;
  /** Extra bottom padding on scroll content. Defaults to 0. */
  bottomPadding?: number;
  /** Scale factor on press. Defaults to 0.88. */
  pressScale?: number;
  /** Duration of press-down animation in ms. Defaults to 70. */
  pressDuration?: number;
  /** Custom section header renderer. Overrides the default. */
  renderSectionHeader?: (category: string) => React.ReactNode;
  /** Custom named-color map (merged on top of built-in defaults). */
  namedColors?: Record<string, string>;
};

export type PixelMenuOverlayProps<T extends PixelMenuItem = PixelMenuItem> =
  Omit<PixelMenuGridProps<T>, "searchTerm"> & {
  /** Placeholder text for search input. Defaults to "Search in menu". */
  searchPlaceholder?: string;
  /** Shadow color for the search pill. Defaults to primaryColor. */
  searchShadowColor?: string;
  /** Background color of the search pill. Defaults to "#FFFFFF". */
  searchBackgroundColor?: string;
  /** Search input text color. Defaults to "#202124". */
  searchTextColor?: string;
  /** Search placeholder text color. Defaults to "#9AA0A6". */
  searchPlaceholderColor?: string;
  /** Render custom search icon. */
  renderSearchIcon?: () => React.ReactNode;
  /** Render custom clear icon. */
  renderClearIcon?: () => React.ReactNode;
  /** Whether to show the search bar. Defaults to true. */
  showSearch?: boolean;
  /** Content rendered above the search bar. */
  headerContent?: React.ReactNode;
};

// ─── PixelMenuGrid ───────────────────────────────────────────────────────────

export function PixelMenuGrid<T extends PixelMenuItem>({
  items,
  sections: sectionsProp,
  renderIcon,
  onItemPress,
  searchTerm = "",
  primaryColor = "#2563EB",
  ruleColor,
  iconCircleColor = "#FFFFFF",
  labelColor = "#1F2937",
  columns = 4,
  iconSize = 64,
  iconRenderSize = 32,
  cardGap = 12,
  horizontalPadding = 16,
  bottomPadding = 0,
  pressScale = 0.88,
  pressDuration = 70,
  renderSectionHeader,
  namedColors,
}: PixelMenuGridProps<T>) {
  const [containerWidth, setContainerWidth] = useState(0);

  const scaleAnims = useRef<Record<string, Animated.Value>>({}).current;
  const cardRefs   = useRef<Record<string, View | null>>({});

  function getScaleAnim(key: string): Animated.Value {
    if (!scaleAnims[key]) scaleAnims[key] = new Animated.Value(1);
    return scaleAnims[key];
  }

  function handleCardPress(item: T) {
    Keyboard.dismiss();
    const anim = getScaleAnim(item.key);
    Animated.timing(anim, {
      toValue: pressScale,
      duration: pressDuration,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      if (onItemPress) {
        const ref = cardRefs.current[item.key];
        if (ref) {
          ref.measure((_x, _y, width, height, pageX, pageY) => {
            onItemPress(item, { x: pageX, y: pageY, width, height });
          });
        } else {
          onItemPress(item, { x: 0, y: 0, width: 0, height: 0 });
        }
      }
      Animated.spring(anim, {
        toValue: 1,
        tension: 300,
        friction: 20,
        useNativeDriver: true,
      }).start();
    });
  }

  const cardW =
    containerWidth > 0
      ? (containerWidth - horizontalPadding * 2 - cardGap * (columns - 1)) / columns
      : 0;

  const onLayout = (e: LayoutChangeEvent) =>
    setContainerWidth(e.nativeEvent.layout.width);

  // Build sections
  const allSections: PixelMenuSection<T>[] =
    sectionsProp ?? (items ? groupAndSort(items) : []);

  // Apply search filter
  const query = searchTerm.trim().toLowerCase();
  const filteredSections = query
    ? allSections
        .map((s) => ({
          ...s,
          items: s.items.filter((i) =>
            i.title?.toLowerCase().includes(query)
          ),
        }))
        .filter((s) => s.items.length > 0)
    : allSections;

  const effectiveRuleColor = ruleColor ?? primaryColor + "80";

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 28 + bottomPadding }}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      onLayout={onLayout}
    >
      <View style={{ paddingHorizontal: horizontalPadding }}>
        {containerWidth > 0 &&
          filteredSections.map((section) => (
            <View key={section.category} style={styles.section}>
              {/* Section header */}
              {renderSectionHeader ? (
                renderSectionHeader(section.category)
              ) : (
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionAccentBar, { backgroundColor: primaryColor }]} />
                  <Text style={[styles.sectionTitle, { color: primaryColor }]}>
                    {section.category}
                  </Text>
                  <View style={[styles.sectionRule, { backgroundColor: effectiveRuleColor }]} />
                </View>
              )}

              {/* Grid */}
              <View style={styles.grid}>
                {section.items.map((item, index) => {
                  const color = resolveColor(item.color, primaryColor, namedColors);
                  return (
                    <Animated.View
                      key={item.key}
                      collapsable={false}
                      ref={(r: any) => { cardRefs.current[item.key] = r as View | null; }}
                      style={{
                        width: cardW,
                        alignItems: "center",
                        marginRight: (index + 1) % columns === 0 ? 0 : cardGap,
                        marginBottom: 20,
                        transform: [{ scale: getScaleAnim(item.key) }],
                      }}
                    >
                      <TouchableOpacity
                        activeOpacity={1}
                        onPress={() => handleCardPress(item)}
                        style={styles.cardTouch}
                      >
                        <View
                          style={[
                            styles.iconCircle,
                            {
                              width: iconSize,
                              height: iconSize,
                              borderRadius: iconSize / 2,
                              backgroundColor: iconCircleColor,
                            },
                          ]}
                        >
                          {renderIcon(item, color, iconRenderSize)}
                        </View>
                        <Text style={[styles.cardLabel, { color: labelColor }]} numberOfLines={2}>
                          {item.title}
                        </Text>
                      </TouchableOpacity>
                    </Animated.View>
                  );
                })}
              </View>
            </View>
          ))}
      </View>
    </ScrollView>
  );
}

// ─── PixelMenuOverlay ────────────────────────────────────────────────────────

export function PixelMenuOverlay<T extends PixelMenuItem>({
  searchPlaceholder = "Search in menu",
  searchShadowColor,
  searchBackgroundColor = "#FFFFFF",
  searchTextColor = "#202124",
  searchPlaceholderColor = "#9AA0A6",
  renderSearchIcon,
  renderClearIcon,
  showSearch = true,
  headerContent,
  primaryColor = "#2563EB",
  ...gridProps
}: PixelMenuOverlayProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");

  const effectiveShadowColor = searchShadowColor ?? primaryColor;

  return (
    <View style={styles.overlayRoot}>
      {headerContent}

      {showSearch && (
        <View style={styles.searchHeader}>
          <View
            style={[
              styles.searchWrap,
              {
                backgroundColor: searchBackgroundColor,
                shadowColor: effectiveShadowColor,
              },
            ]}
          >
            {renderSearchIcon ? (
              renderSearchIcon()
            ) : (
              <Text style={styles.defaultSearchIcon}>&#x1F50D;</Text>
            )}
            <TextInput
              style={[styles.searchInput, { color: searchTextColor }]}
              placeholder={searchPlaceholder}
              placeholderTextColor={searchPlaceholderColor}
              value={searchTerm}
              onChangeText={setSearchTerm}
              returnKeyType="search"
            />
            {searchTerm.length > 0 && (
              <TouchableOpacity onPress={() => setSearchTerm("")} activeOpacity={0.7}>
                {renderClearIcon ? (
                  renderClearIcon()
                ) : (
                  <Text style={styles.defaultClearIcon}>✕</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <PixelMenuGrid<T>
        {...(gridProps as PixelMenuGridProps<T>)}
        primaryColor={primaryColor}
        searchTerm={searchTerm}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Grid
  section: {
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    marginTop: 8,
    gap: 8,
  },
  sectionAccentBar: {
    width: 4,
    height: 16,
    borderRadius: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
    marginRight: 4,
  },
  sectionRule: {
    flex: 1,
    height: 1,
    opacity: 0.5,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cardTouch: {
    alignItems: "center",
    width: "100%",
  },
  iconCircle: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 16,
  },

  // Overlay
  overlayRoot: {
    flex: 1,
  },
  searchHeader: {
    paddingTop: 16,
    paddingBottom: 6,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 14,
    marginTop: 4,
    marginBottom: 4,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 999,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 5,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 17,
    paddingVertical: 0,
    letterSpacing: 0.1,
  },
  defaultSearchIcon: {
    fontSize: 20,
    color: "#5F6368",
  },
  defaultClearIcon: {
    fontSize: 18,
    color: "#5F6368",
    fontWeight: "700",
  },
});
