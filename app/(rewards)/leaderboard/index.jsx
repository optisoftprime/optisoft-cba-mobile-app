// screens/Leaderboard.jsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { navigateBack } from 'app/navigate';
import Header from 'components/header';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'config/ThemeContext';
import { withFeature } from 'components/layout/coming-soon';

function Leaderboard() {
  const { colors } = useTheme();
  const [selectedPeriod, setSelectedPeriod] = useState('This Month');

  const leaderboardData = [
    {
      id: 1,
      rank: 1,
      name: 'Emma Wilson',
      memberType: 'Diamond member',
      points: 6470,
      isCurrentUser: false,
      badge: '👑',
    },
    {
      id: 2,
      rank: 2,
      name: 'Marcus Chen',
      memberType: 'Platinum Member',
      points: 6470,
      isCurrentUser: false,
      badge: '👑',
    },
    {
      id: 3,
      rank: 3,
      name: 'You',
      memberType: 'Platinum member',
      points: 6470,
      isCurrentUser: true,
      badge: '👑',
    },
    {
      id: 4,
      rank: 4,
      name: 'Sofia Garcia',
      memberType: 'Gold member',
      points: 6470,
      isCurrentUser: false,
      badge: '👑',
    },
    {
      id: 5,
      rank: 5,
      name: 'Alex Kumar',
      memberType: 'Gold member',
      points: 6470,
      isCurrentUser: false,
      badge: '👑',
    },
    {
      id: 6,
      rank: 6,
      name: 'John Dave',
      memberType: 'Platinum member',
      points: 6470,
      isCurrentUser: false,
      badge: '👑',
    },
  ];

  // Gold rank chips use the warning (amber) tokens; third place the primary tint.
  const getRankColor = (rank) => {
    switch (rank) {
      case 1:
        return 'bg-warning-soft';
      case 2:
        return 'bg-warning-soft';
      case 3:
        return 'bg-primary-light';
      case 4:
        return 'bg-warning-soft';
      case 5:
        return 'bg-warning-soft';
      default:
        return 'bg-warning-soft';
    }
  };

  return (
    <View className="flex-1 bg-background">
      <Header title="Leaderboard" onLeftPress={navigateBack} showLeftIcon={true} />

      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        {/* Period Selector */}
        <View className="mb-4 flex-row items-center justify-end">
          <TouchableOpacity className="flex-row items-center rounded-full border border-line bg-card px-3 py-1.5">
            <Text className="mr-2 text-sm font-medium text-ink">{selectedPeriod}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.inkMuted} />
          </TouchableOpacity>
        </View>

        {/* Leaderboard List */}
        {leaderboardData.map((user) => (
          <View
            key={user.id}
            className={`mb-3 flex-row items-center rounded-2xl border px-4 py-3.5 ${
              user.isCurrentUser ? 'border-primary bg-primary-light' : 'border-line bg-card'
            }`}>
            {/* Rank Badge */}
            <View
              className={`mr-3 h-10 w-10 items-center justify-center rounded-xl ${getRankColor(user.rank)}`}>
              <Text
                className={`text-base font-bold ${
                  user.rank === 3 ? 'text-primary-dark' : 'text-on-warning-soft'
                }`}>
                {user.rank}
              </Text>
            </View>

            {/* Crown Badge */}
            {user.badge && <Text className="mr-2 text-xl">{user.badge}</Text>}

            {/* User Info */}
            <View className="flex-1">
              <Text className="mb-0.5 text-[15px] font-semibold text-ink">{user.name}</Text>
              <Text className="text-xs text-ink-muted">{user.memberType}</Text>
            </View>

            {/* Points */}
            <View className="flex-row items-center">
              <Ionicons name="diamond" size={14} color={colors.warning} />
              <Text className="ml-1 text-base font-bold text-ink">{user.points}</Text>
              <Ionicons name="arrow-up" size={14} color={colors.success} className="ml-1" />
            </View>
          </View>
        ))}

        {/* Bottom Spacing */}
        <View className="h-6" />
      </ScrollView>
    </View>
  );
}

// Backend not live yet — renders "Coming soon" until config/features.js enables it.
export default withFeature('rewards', Leaderboard);
