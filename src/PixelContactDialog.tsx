/**
 * PixelContactDialog — pre-built contact dialog with Call, WhatsApp, SMS, Email.
 *
 * Wraps PixelDialog with common contact actions. No external dependencies —
 * icons are provided by the consumer via renderIcon.
 */

import React from "react";
import { Linking } from "react-native";
import { PixelDialog, type PixelDialogButton } from "./PixelDialog";
import type { LaunchOrigin } from "./PixelLaunchContainer";

export type ContactAction = "call" | "whatsapp" | "sms" | "email";

export type PixelContactDialogProps = {
  visible: boolean;
  origin: LaunchOrigin | null;
  phone?: string;
  email?: string;
  /** Country code for WhatsApp (default: "91") */
  countryCode?: string;
  /** Actions to show. If omitted, auto-detected from phone/email props */
  actions?: ContactAction[];
  title?: string;
  message?: string;
  /** Icon rendered above the title */
  icon?: React.ReactNode;
  /** Render icon for each action button — receives action name + resolved color */
  renderIcon?: (action: ContactAction, color: string) => React.ReactNode;
  onDismiss: () => void;
};

const ACTION_CONFIG: Record<ContactAction, {
  label: string;
  color: string;
  getUrl: (phone: string, email: string, countryCode: string) => string;
}> = {
  call: {
    label: "Call",
    color: "#2563EB",
    getUrl: (phone) => `tel:${phone}`,
  },
  whatsapp: {
    label: "WhatsApp",
    color: "#25D366",
    getUrl: (phone, _, countryCode) => `https://wa.me/${countryCode}${phone}`,
  },
  sms: {
    label: "SMS",
    color: "#F59E0B",
    getUrl: (phone) => `sms:${phone}`,
  },
  email: {
    label: "Email",
    color: "#EA4335",
    getUrl: (_, email) => `mailto:${email}`,
  },
};

export function PixelContactDialog({
  visible,
  origin,
  phone = "",
  email = "",
  countryCode = "91",
  actions,
  title,
  message = "Choose an option",
  icon,
  renderIcon,
  onDismiss,
}: PixelContactDialogProps) {
  // Auto-detect actions if not provided
  const resolvedActions = actions ?? [
    ...(phone ? (["call", "whatsapp", "sms"] as ContactAction[]) : []),
    ...(email ? (["email"] as ContactAction[]) : []),
  ];

  const buttons: PixelDialogButton[] = [
    ...resolvedActions.map((action) => {
      const config = ACTION_CONFIG[action];
      return {
        label: config.label,
        color: config.color,
        icon: renderIcon
          ? (color: string) => renderIcon(action, color)
          : undefined,
        onPress: () => {
          onDismiss();
          Linking.openURL(config.getUrl(phone, email, countryCode));
        },
      };
    }),
    {
      label: "Cancel",
      style: "cancel" as const,
      onPress: onDismiss,
    },
  ];

  const resolvedTitle = title ?? phone ?? email ?? "Contact";

  return (
    <PixelDialog
      visible={visible}
      origin={origin}
      title={resolvedTitle}
      message={message}
      icon={icon}
      buttons={buttons}
      onDismiss={onDismiss}
    />
  );
}
