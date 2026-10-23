import React from 'react';
import { View, Text, TextInput as RNTextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'config/ThemeContext';

const TextInputComponent = ({
  // Label & Error
  label,
  error,

  // Icon
  iconName,
  iconPosition = 'right',
  iconColor,
  onIconPress,
  IconComponent = Ionicons,
  iconSize = 20,

  // Password toggle
  showPasswordToggle = false,
  secureTextEntry = false,
  onToggleSecureTextEntry,

  // Loading state
  isLoading = false,

  // Custom styles
  containerStyle = {},
  labelStyle = {},
  inputStyle = {},
  errorStyle = {},
  iconContainerStyle = {},

  // Border colors
  defaultBorderColor,
  errorBorderColor,

  // Font size
  defaultFontSize = 16,

  // Placeholder color
  placeholderTextColor,

  // Text colors
  defaultTextColor,
  defaultLabelColor,
  labelColor,
  textColor,

  // State
  value,
  onChangeText,

  // Additional props
  style,
  ...props
}) => {
  const { colors } = useTheme();

  // Resolve color props with the theme as fallback so explicit props still win.
  const resolvedIconColor = iconColor ?? colors.primary;
  const resolvedDefaultBorderColor = defaultBorderColor ?? colors.border;
  const resolvedErrorBorderColor = errorBorderColor ?? colors.error;
  const resolvedPlaceholderColor = placeholderTextColor ?? colors.textMuted;
  const resolvedDefaultTextColor = defaultTextColor ?? colors.textPrimary;
  const resolvedDefaultLabelColor = defaultLabelColor ?? colors.textPrimary;

  const handleIconPress = () => {
    if (showPasswordToggle && onToggleSecureTextEntry) {
      onToggleSecureTextEntry();
    } else if (onIconPress) {
      onIconPress();
    }
  };

  const getPasswordIconName = () => (secureTextEntry ? 'eye-off' : 'eye');
  const getIconName = () => (showPasswordToggle ? getPasswordIconName() : iconName);
  const hasIcon = iconName || showPasswordToggle;

  const actualLabelColor = labelColor || resolvedDefaultLabelColor;
  const actualTextColor = textColor || resolvedDefaultTextColor;

  const getInputPadding = () => {
    if (!hasIcon) return {};
    if (iconPosition === 'left') return { paddingLeft: 48 };
    if (iconPosition === 'right') return { paddingRight: 48 };
    return {};
  };

  const getIconPositionStyle = () => {
    if (iconPosition === 'left') return { left: 16 };
    if (iconPosition === 'right') return { right: 16 };
    return {};
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text
          style={[
            styles.label,
            { color: isLoading ? colors.textMuted : actualLabelColor },
            labelStyle,
          ]}>
          {label}
        </Text>
      )}

      <View style={isLoading ? styles.loadingOverlay : null}>
        {/* Icon - Left */}
        {hasIcon && iconPosition === 'left' && (
          <TouchableOpacity
            onPress={handleIconPress}
            style={[styles.icon, getIconPositionStyle(), iconContainerStyle]}
            activeOpacity={0.7}
            disabled={(!onIconPress && !showPasswordToggle) || isLoading}>
            <IconComponent
              name={getIconName()}
              size={iconSize}
              color={isLoading ? colors.textMuted : resolvedIconColor}
            />
          </TouchableOpacity>
        )}

        <RNTextInput
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor={resolvedPlaceholderColor}
          secureTextEntry={secureTextEntry}
          editable={!isLoading}
          style={[
            styles.input,
            getInputPadding(),
            {
              borderColor: error ? resolvedErrorBorderColor : resolvedDefaultBorderColor,
              fontSize: defaultFontSize,
              color: isLoading ? colors.textMuted : actualTextColor,
              backgroundColor: isLoading ? colors.cardMuted : colors.cardBackground,
              opacity: isLoading ? 0.7 : 1,
            },
            inputStyle,
            style,
          ]}
          {...props}
        />

        {/* Icon - Right */}
        {hasIcon && iconPosition === 'right' && (
          <TouchableOpacity
            onPress={handleIconPress}
            style={[styles.icon, getIconPositionStyle(), iconContainerStyle]}
            activeOpacity={0.7}
            disabled={(!onIconPress && !showPasswordToggle) || isLoading}>
            <IconComponent
              name={getIconName()}
              size={iconSize}
              color={isLoading ? colors.textMuted : resolvedIconColor}
            />
          </TouchableOpacity>
        )}
      </View>

      {error && !isLoading && (
        <Text style={[styles.error, { color: resolvedErrorBorderColor }, errorStyle]}>{error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  label: {
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  icon: {
    position: 'absolute',
    top: 14,
    zIndex: 10,
  },
  error: {
    marginTop: 4,
    fontSize: 14,
  },
  loadingOverlay: {
    opacity: 0.6,
  },
});

export default TextInputComponent;
