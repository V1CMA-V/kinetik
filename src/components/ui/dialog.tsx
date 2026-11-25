import { Modal, Pressable, View } from 'react-native';
import { create } from 'zustand';

import { Text } from '@/components/ui/text';

export type DialogButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

type DialogConfig = { title: string; message?: string; buttons: DialogButton[] };

type DialogState = {
  current: DialogConfig | null;
  queue: DialogConfig[];
};

const useDialogStore = create<DialogState>(() => ({ current: null, queue: [] }));

const OK: DialogButton[] = [{ text: 'Entendido' }];

/**
 * App-styled replacement for `Alert.alert` (same arguments). Dialogs opened while
 * another one is showing wait their turn, so a button can open a follow-up dialog.
 */
export function alert(title: string, message?: string, buttons: DialogButton[] = OK) {
  const config = { title, message, buttons: buttons.length ? buttons : OK };
  useDialogStore.setState((s) =>
    s.current ? { queue: [...s.queue, config] } : { current: config },
  );
}

/** Close the current dialog (showing the next queued one), then run the button's action. */
function close(button?: DialogButton) {
  useDialogStore.setState((s) => ({ current: s.queue[0] ?? null, queue: s.queue.slice(1) }));
  button?.onPress?.();
}

const BUTTON_CLASSES: Record<NonNullable<DialogButton['style']>, { box: string; text: string }> = {
  default: { box: 'bg-accent', text: 'text-on-accent' },
  destructive: { box: 'bg-expense-soft', text: 'text-expense' },
  cancel: { box: 'bg-sunken', text: 'text-ink' },
};

/** Renders the current dialog. Mount once, inside the themed root view. */
export function DialogHost() {
  const current = useDialogStore((s) => s.current);
  if (!current) return null;

  const { title, message, buttons } = current;
  const cancel = buttons.find((b) => b.style === 'cancel');
  // Cancel goes last when buttons stack, and first (left) when they sit side by side.
  const stacked = buttons.length > 2;
  const ordered = stacked
    ? [...buttons.filter((b) => b !== cancel), ...(cancel ? [cancel] : [])]
    : [...(cancel ? [cancel] : []), ...buttons.filter((b) => b !== cancel)];

  return (
    <Modal
      transparent
      visible
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      // Android back button / gesture: same as "Cancelar", or just close if there's none.
      onRequestClose={() => close(cancel)}
    >
      <View className="flex-1 items-center justify-center bg-black/50 px-6">
        <View
          accessibilityViewIsModal
          accessibilityRole="alert"
          className="w-full max-w-sm gap-5 rounded-card bg-card p-6"
        >
          <View className="gap-2">
            <Text className="font-display text-xl font-bold text-ink">{title}</Text>
            {message ? <Text className="text-base leading-6 text-ink-muted">{message}</Text> : null}
          </View>

          <View className={stacked ? 'gap-2' : 'flex-row gap-3'}>
            {ordered.map((button) => {
              const classes = BUTTON_CLASSES[button.style ?? 'default'];
              return (
                <Pressable
                  key={button.text}
                  accessibilityRole="button"
                  onPress={() => close(button)}
                  className={`h-12 items-center justify-center rounded-full px-4 active:opacity-80 ${classes.box} ${
                    stacked ? '' : 'flex-1'
                  }`}
                >
                  <Text numberOfLines={1} className={`text-base font-semibold ${classes.text}`}>
                    {button.text}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}
