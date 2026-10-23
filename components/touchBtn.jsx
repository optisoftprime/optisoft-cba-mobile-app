import React from 'react';
import { View, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'config/ThemeContext';

const TouchBtn = ({
  onPress,
  label,
  isLoading = false,
  loadingText,
  disabled = false,

  // Container styling
  containerClassName = 'px-6 pb-8',

  // Button styling
  buttonClassName = 'items-center rounded-xl py-4', // REMOVED 'w-full' from here
  backgroundColor,
  borderColor,
  borderWidth = 0,

  // Text styling
  textClassName = 'text-[15px] font-semibold',
  textColor = 'white',

  // Loading styling
  loadingColor = 'white',
  loadingSize = 'small',

  // Icon support
  icon,
  iconPosition = 'left', // 'left' or 'right'
  iconSpacing = 8, // spacing between icon and text

  // Touchable props
  activeOpacity = 0.8,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  // Resolve color props with the theme as fallback so explicit props still win.
  const resolvedBackgroundColor = backgroundColor ?? colors.primary;
  const resolvedBorderColor = borderColor ?? colors.primary;

  // Resolve user-facing defaults through i18n (props still override).
  const resolvedLabel = label ?? t('components.continue');
  const resolvedLoadingText = loadingText ?? t('components.loading');

  const handlePress = () => {
    if (!disabled && !isLoading) {
      onPress();
    }
  };

  const isDisabled = disabled || isLoading;

  // Screens pass their own buttonClassName, most with the old `rounded-lg`.
  // Normalise the corner radius here so every button matches the new design
  // without touching 57 call sites.
  const resolvedButtonClassName = buttonClassName.replace(
    /\brounded-(?:sm|md|lg)\b/g,
    'rounded-xl'
  );

  const renderContent = () => {
    if (isLoading) {
      return (
        <View className="flex-row items-center justify-center">
          <ActivityIndicator color={loadingColor} size={loadingSize} style={{ marginRight: 8 }} />
          <Text className={textClassName} style={{ color: textColor }}>
            {resolvedLoadingText}
          </Text>
        </View>
      );
    }

    return (
      <View className="flex-row items-center justify-center">
        {icon && iconPosition === 'left' && (
          <View style={{ marginRight: iconSpacing }}>{icon}</View>
        )}

        <Text className={textClassName} style={{ color: textColor }}>
          {resolvedLabel}
        </Text>

        {icon && iconPosition === 'right' && (
          <View style={{ marginLeft: iconSpacing }}>{icon}</View>
        )}
      </View>
    );
  };

  const buttonStyle = {
    // Disabled keeps the button's own colour, faded (opacity below), rather
    // than switching to grey — the button still reads as the same control.
    backgroundColor: resolvedBackgroundColor,
    borderColor: resolvedBorderColor || resolvedBackgroundColor, // Default border color same as background
    borderWidth: borderWidth,
  };

  return (
    <View className={containerClassName}>
      <TouchableOpacity
        onPress={handlePress}
        disabled={isDisabled}
        className={`${resolvedButtonClassName} ${isDisabled ? 'opacity-50' : ''}`}
        style={buttonStyle}
        activeOpacity={activeOpacity}>
        {renderContent()}
      </TouchableOpacity>
    </View>
  );
};

export default TouchBtn;
