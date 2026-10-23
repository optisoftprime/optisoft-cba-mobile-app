// components/QuickAmountGrid.jsx
//
// Opay-style quick-amount chips: a 3-per-row grid of preset ₦ amounts that
// highlight when selected. Shared by the airtime / electricity / cable screens
// so a user can tap a common amount instead of always typing it. Pairs with a
// custom amount input alongside it — both drive the same `value` state.
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from 'config/ThemeContext';

export default function QuickAmountGrid({ amounts = [], value, onSelect }) {
  const { colors } = useTheme();
  // `value` may be comma-formatted ("2,000") — strip before comparing.
  const current = Number(String(value ?? '').replace(/,/g, '')) || 0;
  return (
    <View className="flex-row flex-wrap justify-between">
      {amounts.map((amt) => {
        const isSelected = current === amt;
        return (
          <TouchableOpacity
            key={amt}
            onPress={() => onSelect(String(amt))}
            activeOpacity={0.85}
            className="mb-3 items-center rounded-xl py-3"
            style={{
              width: '31.5%',
              borderWidth: isSelected ? 1.5 : 1,
              borderColor: isSelected ? colors.primary : colors.border,
              backgroundColor: isSelected ? colors.primaryLight : colors.cardBackground,
            }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: '700',
                color: isSelected ? colors.primary : colors.textPrimary,
              }}>
              ₦{amt.toLocaleString('en-NG')}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
