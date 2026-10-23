import React from 'react';
import Toast from 'react-native-toast-message';

export default function FeatureGate({
  enabled = true,
  message = 'This feature is currently unavailable.',
  children,
}) {
  if (enabled) return children;

  return React.cloneElement(children, {
    onPress: () =>
      Toast.show({
        type: 'info',
        text1: 'Not available',
        text2: message,
      }),
    activeOpacity: 0.8,
    style: [
      children.props.style,
      {
        opacity: 0.5,
      },
    ],
  });
}
