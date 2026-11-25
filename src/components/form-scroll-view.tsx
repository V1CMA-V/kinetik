import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

type Props = {
  children: ReactNode;
  /** Vertically center short content (e.g. sign-in). */
  centered?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

/**
 * Scroll container for forms: keeps the focused input above the keyboard
 * on both platforms (Android is edge-to-edge, so the window doesn't resize).
 */
export function FormScrollView({ children, centered, contentContainerStyle }: Props) {
  return (
    <KeyboardAwareScrollView
      bottomOffset={24}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        { gap: 24, paddingVertical: 24 },
        centered && { flexGrow: 1, justifyContent: 'center' },
        contentContainerStyle,
      ]}
    >
      {children}
    </KeyboardAwareScrollView>
  );
}
