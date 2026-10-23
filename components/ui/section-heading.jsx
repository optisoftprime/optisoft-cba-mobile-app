import { Pressable, Text, View } from 'react-native';

/**
 * A section title with an optional action on the right.
 *
 * `action` takes any node (a SelectPill, say). For the common case of a plain
 * tappable label, pass `actionLabel` instead — `actionAsPill` renders it as a
 * filled pill rather than a link.
 */
export function SectionHeading({
  title,
  action = null,
  actionLabel,
  actionAsPill = false,
  onPressAction,
  className = '',
}) {
  return (
    <View className={`mb-3 flex-row items-center justify-between gap-3 ${className}`}>
      <Text className="text-[17px] font-bold text-ink">{title}</Text>

      {action}

      {!action && actionLabel ? (
        <Pressable accessibilityRole="button" onPress={onPressAction} hitSlop={8}>
          {actionAsPill ? (
            <View className="rounded-full bg-primary-light px-4 py-1.5">
              <Text className="text-[13px] font-medium text-primary-dark">{actionLabel}</Text>
            </View>
          ) : (
            <Text className="text-[13px] font-medium text-primary">{actionLabel}</Text>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}
