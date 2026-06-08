"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PixelLaunchContainer = PixelLaunchContainer;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const { width: SCREEN_W, height: SCREEN_H } = react_native_1.Dimensions.get("window");
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
function PixelLaunchContainer({ visible, origin, onClose: _onClose, onDismissed, backgroundColor = "#FFFFFF", children, }) {
    const progress = (0, react_1.useRef)(new react_native_1.Animated.Value(0)).current;
    const radiusAnim = (0, react_1.useRef)(new react_native_1.Animated.Value(SCREEN_W / 2)).current;
    const [mounted, setMounted] = (0, react_1.useState)(false);
    const [activeOrigin, setActiveOrigin] = (0, react_1.useState)(null);
    const hasOpenedRef = (0, react_1.useRef)(false);
    (0, react_1.useEffect)(() => {
        if (visible && origin) {
            hasOpenedRef.current = true;
            setActiveOrigin(origin);
            setMounted(true);
            progress.setValue(0);
            radiusAnim.setValue(SCREEN_W / 2);
            react_native_1.Animated.parallel([
                // Open — underdamped spring (~380 ms), gentle elastic overshoot
                react_native_1.Animated.spring(progress, {
                    toValue: 1,
                    tension: 200,
                    friction: 16,
                    useNativeDriver: true,
                }),
                // Radius trails scale slightly for a natural circle→flat reveal
                react_native_1.Animated.spring(radiusAnim, {
                    toValue: 0,
                    tension: 160,
                    friction: 18,
                    useNativeDriver: false,
                }),
            ]).start();
        }
        else if (!visible && hasOpenedRef.current) {
            react_native_1.Animated.parallel([
                // Close — overdamped, no bounce (~280 ms)
                react_native_1.Animated.spring(progress, {
                    toValue: 0,
                    tension: 280,
                    friction: 28,
                    useNativeDriver: true,
                }),
                // Radius matches close cadence
                react_native_1.Animated.spring(radiusAnim, {
                    toValue: SCREEN_W / 2,
                    tension: 240,
                    friction: 28,
                    useNativeDriver: false,
                }),
            ]).start(({ finished }) => {
                if (finished) {
                    hasOpenedRef.current = false;
                    setMounted(false);
                    onDismissed === null || onDismissed === void 0 ? void 0 : onDismissed();
                }
            });
        }
    }, [visible]);
    if (!mounted || !activeOrigin)
        return null;
    // ── Animation math ───────────────────────────────────────────────────────────
    const originCX = activeOrigin.x + activeOrigin.width / 2;
    const originCY = activeOrigin.y + activeOrigin.height / 2;
    const OX = originCX - SCREEN_W / 2;
    const OY = originCY - SCREEN_H / 2;
    // Scale 0 → 1 so the overlay fully disappears (size 0) on close
    const scale = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
    });
    // offset = OX * (1 − scale): at scale=0 overlay centre sits on origin centre
    const translateX = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [OX, 0],
    });
    const translateY = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [OY, 0],
    });
    // Appear near-instantly on open; scale→0 on close eliminates the box visually
    const opacity = progress.interpolate({
        inputRange: [0, 0.05, 1],
        outputRange: [0, 1, 1],
        extrapolate: "clamp",
    });
    return (react_1.default.createElement(react_native_1.Animated.View, { style: [{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }, { zIndex: 200, elevation: 200, opacity }] },
        react_1.default.createElement(react_native_1.Animated.View, { style: { flex: 1, transform: [{ translateX }, { translateY }, { scale }] } },
            react_1.default.createElement(react_native_1.Animated.View, { style: {
                    flex: 1,
                    backgroundColor,
                    borderRadius: radiusAnim,
                    overflow: "hidden",
                } }, children))));
}
