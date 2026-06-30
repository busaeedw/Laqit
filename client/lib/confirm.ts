import { Alert, Platform } from "react-native";

type ConfirmOptions = {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
};

/**
 * Cross-platform confirmation dialog.
 *
 * On native, uses `Alert.alert` with a cancel/confirm button pair.
 * On web, `Alert.alert` button callbacks never fire (react-native-web does not
 * implement them), so we fall back to the browser's native `window.confirm`.
 *
 * Resolves `true` when the user confirms, `false` otherwise.
 */
export function confirmDialog({
  title,
  message = "",
  confirmText = "تأكيد",
  cancelText = "إلغاء",
  destructive = false,
}: ConfirmOptions): Promise<boolean> {
  if (Platform.OS === "web") {
    const text = message ? `${title}\n\n${message}` : title;
    if (typeof window !== "undefined" && typeof window.confirm === "function") {
      return Promise.resolve(window.confirm(text));
    }
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelText, style: "cancel", onPress: () => resolve(false) },
        {
          text: confirmText,
          style: destructive ? "destructive" : "default",
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}
