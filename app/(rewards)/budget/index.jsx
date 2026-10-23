// screens/BudgetBlitz.jsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { navigateBack } from 'app/navigate';
import Header from 'components/header';
import { withFeature } from 'components/layout/coming-soon';

function BudgetBlitz() {
  const [selectedOption, setSelectedOption] = useState(null);

  const options = [
    {
      id: 'A',
      label: 'A',
      text: '₦500 - Live it up!',
      color: 'bg-ink-soft',
    },
    {
      id: 'B',
      label: 'B',
      text: '₦300 - Balanced Fun',
      color: 'bg-ink-soft',
    },
    {
      id: 'C',
      label: 'C',
      text: '₦200 - Smart Choice',
      color: 'bg-success',
      isCorrect: true,
    },
    {
      id: 'D',
      label: 'D',
      text: '₦50 - Minimal Spending',
      color: 'bg-ink-soft',
    },
  ];

  const handleOptionPress = (optionId) => {
    setSelectedOption(optionId);
  };

  return (
    <View className="flex-1 bg-background">
      <Header title="Budget Blitz" onLeftPress={navigateBack} showLeftIcon={true} />

      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
        {/* Subtitle */}
        <Text className="mb-4 text-center text-sm text-ink-muted">
          Make the smartest financial choice
        </Text>

        {/* Score and Level */}
        <View className="mb-6 flex-row items-center justify-end">
          <View className="mr-6 items-center">
            <Text className="text-xs text-ink-muted">Score</Text>
            <Text className="text-xl font-bold text-primary">0</Text>
          </View>
          <View className="items-center">
            <Text className="text-xs text-ink-muted">Level</Text>
            <Text className="text-xl font-bold text-primary">1</Text>
          </View>
        </View>

        {/* Scenario Card */}
        <View className="mb-6 rounded-2xl bg-warning-soft p-4">
          <Text className="mb-2 text-base font-bold text-on-warning-soft">Scenario:</Text>
          <Text className="text-sm leading-relaxed text-ink">
            Your monthly income is ₦3000. Rent is ₦800, groceries ₦400, utilities ₦150. You want to
            save ₦500. What should you allocate for entertainment?
          </Text>
        </View>

        {/* Options */}
        <View className="mb-6">
          {options.map((option) => (
            <TouchableOpacity
              key={option.id}
              onPress={() => handleOptionPress(option.id)}
              className={`mb-3 flex-row items-center rounded-2xl border px-4 py-4 ${
                selectedOption === option.id
                  ? 'border-success bg-success-soft'
                  : 'border-line bg-card'
              }`}
              activeOpacity={0.7}>
              {/* Letter Badge */}
              <View
                className={`mr-3 h-10 w-10 items-center justify-center rounded-xl ${
                  selectedOption === option.id ? option.color : 'bg-card-muted'
                }`}>
                <Text
                  className={`text-base font-bold ${
                    selectedOption === option.id ? 'text-on-primary' : 'text-ink-muted'
                  }`}>
                  {option.label}
                </Text>
              </View>

              {/* Option Text */}
              <Text className="flex-1 text-[15px] font-medium text-ink">{option.text}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Pro Tips Card */}
        <View className="mb-6 rounded-2xl bg-info-soft p-4">
          <Text className="mb-3 text-base font-bold text-on-info-soft">Pro Tips:</Text>
          <View className="space-y-2">
            <View className="flex-row">
              <Text className="mr-2 text-sm text-ink">•</Text>
              <Text className="flex-1 text-sm text-ink">Always prioritize high-interest debt</Text>
            </View>
            <View className="flex-row">
              <Text className="mr-2 text-sm text-ink">•</Text>
              <Text className="flex-1 text-sm text-ink">
                Keep 3-6 months of expenses in emergency savings
              </Text>
            </View>
            <View className="flex-row">
              <Text className="mr-2 text-sm text-ink">•</Text>
              <Text className="flex-1 text-sm text-ink">
                Balance needs, wants, and savings in your budget
              </Text>
            </View>
          </View>
        </View>

        {/* Bottom Spacing */}
        <View className="h-6" />
      </ScrollView>
    </View>
  );
}

// Backend not live yet — renders "Coming soon" until config/features.js enables it.
export default withFeature('rewards', BudgetBlitz);
