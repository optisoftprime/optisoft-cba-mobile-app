// screens/Rewards.jsx
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { navigateBack, navigateTo } from 'app/navigate';
import Header from 'components/header';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'config/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { withFeature } from 'components/layout/coming-soon';

function Rewards() {
  const { colors, shadows } = useTheme();

  return (
    <View className="flex-1 bg-background">
      <Header title="Rewards" onLeftPress={navigateBack} showLeftIcon={true} />

      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
        {/* Level Card */}

        <LinearGradient
          colors={[colors.panelFrom, colors.panelTo]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className="mb-4 overflow-hidden rounded-3xl p-4">
          {/* Header */}
          <View className="mb-3 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Ionicons name="trophy" size={20} color={colors.onPanel} />
              <Text className="ml-2 text-base font-semibold text-on-panel">
                Level 7 Discipline Builder
              </Text>
            </View>
            <View className="flex-row items-center rounded-full bg-on-panel/20 px-3 py-1">
              <Ionicons name="diamond" size={14} color={colors.onPanel} />
              <Text className="ml-1 text-sm font-semibold text-on-panel">3570</Text>
            </View>
          </View>

          {/* Goal Info */}
          <Text className="mb-2 text-xs text-on-panel/80">Goals: 1/3</Text>
          <Text className="mb-2 text-xs text-on-panel/80">Progress from 0</Text>

          {/* Progress Bar */}
          <View className="mb-3 h-2 overflow-hidden rounded-full bg-on-panel/30">
            <View className="h-full rounded-full bg-warning" style={{ width: '45%' }} />
          </View>

          {/* Stats */}
          <View className="flex-row justify-between">
            <View className="items-center">
              <Text className="text-2xl font-bold text-on-panel">12</Text>
              <Text className="text-xs text-on-panel/80">Points</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-on-panel">12</Text>
              <Text className="text-xs text-on-panel/80">Completed</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-on-panel">12</Text>
              <Text className="text-xs text-on-panel/80">Days</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Daily Challenges */}
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-[17px] font-bold text-ink">Daily Challenges</Text>
          <TouchableOpacity
            className="rounded-full bg-primary-light px-3 py-1.5"
            onPress={() => {
              navigateTo('leaderboard');
            }}>
            <Text className="text-sm font-semibold text-primary-dark">Leaderboard</Text>
          </TouchableOpacity>
        </View>

        {/* Save Consistently Challenge */}
        <View className="mb-3 overflow-hidden rounded-2xl bg-primary p-4">
          <View className="mb-2 flex-row items-center">
            <Ionicons name="wallet" size={20} color={colors.onPrimary} />
            <Text className="ml-2 text-base font-semibold text-on-primary">Save Consistently</Text>
          </View>
          <Text className="mb-3 text-xs text-on-primary/80">
            Complete three savings streaks to earn points
          </Text>
          <View className="mb-2 h-2 overflow-hidden rounded-full bg-on-primary/30">
            <View className="h-full rounded-full bg-on-primary" style={{ width: '60%' }} />
          </View>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Ionicons name="diamond" size={14} color={colors.onPrimary} />
              <Text className="ml-1 text-sm font-semibold text-on-primary">+50 Points</Text>
            </View>
            <Text className="text-xs text-on-primary/80">60%</Text>
          </View>
        </View>

        {/* Check Budget Challenge */}
        <TouchableOpacity
          className="mb-4 overflow-hidden rounded-2xl bg-success p-4"
          onPress={() => {
            navigateTo('budget');
          }}>
          <View className="mb-2 flex-row items-center">
            <Ionicons name="calculator" size={20} color={colors.onPrimary} />
            <Text className="ml-2 text-base font-semibold text-on-primary">Check your budget</Text>
          </View>
          <Text className="mb-3 text-xs text-on-primary/80">Log your expenses regularly</Text>
          <View className="mb-2 h-2 overflow-hidden rounded-full bg-on-primary/30">
            <View className="h-full rounded-full bg-on-primary" style={{ width: '100%' }} />
          </View>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Ionicons name="diamond" size={14} color={colors.onPrimary} />
              <Text className="ml-1 text-sm font-semibold text-on-primary">+100 Points</Text>
            </View>
            <Text className="text-xs text-on-primary/80">100%</Text>
          </View>
        </TouchableOpacity>

        {/* Weekly Challenge */}
        <Text className="mb-3 text-[17px] font-bold text-ink">Weekly Challenge</Text>

        {/* Weekly Savings Goal */}
        <View
          className="mb-3 overflow-hidden rounded-2xl border border-line bg-card p-4"
          style={shadows.sm}>
          <View className="mb-2 flex-row items-center">
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-primary-light">
              <Ionicons name="trending-up" size={20} color={colors.primary} />
            </View>
            <View className="flex-1">
              <Text className="mb-1 text-[15px] font-semibold text-ink">Weekly Savings Goal</Text>
              <Text className="text-xs text-ink-muted">Save a specific amount by</Text>
            </View>
          </View>
          <View className="mb-2 h-2 overflow-hidden rounded-full bg-card-muted">
            <View className="h-full rounded-full bg-primary" style={{ width: '88%' }} />
          </View>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Ionicons name="time-outline" size={14} color={colors.inkMuted} />
              <Text className="ml-1 text-xs text-ink-muted">5 days left</Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="diamond" size={14} color={colors.warning} />
              <Text className="ml-1 text-xs font-semibold text-warning">500</Text>
            </View>
            <Text className="text-xs font-semibold text-ink">88%</Text>
          </View>
        </View>

        {/* Level Up Money Skills */}
        <View
          className="mb-4 overflow-hidden rounded-2xl border border-line bg-card p-4"
          style={shadows.sm}>
          <View className="mb-2 flex-row items-center">
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-warning-soft">
              <Ionicons name="school" size={20} color={colors.warning} />
            </View>
            <View className="flex-1">
              <Text className="mb-1 text-[15px] font-semibold text-ink">
                Level Up Your Money Skills
              </Text>
              <Text className="text-xs text-ink-muted">Learn about investments</Text>
            </View>
          </View>
          <View className="mb-2 h-2 overflow-hidden rounded-full bg-card-muted">
            <View className="h-full rounded-full bg-warning" style={{ width: '88%' }} />
          </View>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Ionicons name="time-outline" size={14} color={colors.inkMuted} />
              <Text className="ml-1 text-xs text-ink-muted">5 days left</Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="diamond" size={14} color={colors.warning} />
              <Text className="ml-1 text-xs font-semibold text-warning">500</Text>
            </View>
            <Text className="text-xs font-semibold text-ink">88%</Text>
          </View>
        </View>

        {/* Achievements */}
        <Text className="mb-3 text-[17px] font-bold text-ink">Achievements</Text>
        <View className="mb-4 flex-row flex-wrap">
          {[
            'First save',
            '7-day streak',
            'Budget Master',
            'Goal Getter',
            'Investor',
            'Legendary Saver',
          ].map((achievement, index) => (
            <View
              key={index}
              className={`mb-3 mr-3 h-24 w-[30%] items-center justify-center rounded-2xl ${
                index === 2 ? 'bg-success-soft' : 'border border-line bg-card-muted'
              }`}>
              <Ionicons
                name={index === 2 ? 'checkmark-circle' : 'lock-closed'}
                size={32}
                color={index === 2 ? colors.success : colors.inkSoft}
              />
              <Text
                className={`mt-2 text-center text-xs font-medium ${
                  index === 2 ? 'text-on-success-soft' : 'text-ink-muted'
                }`}>
                {achievement}
              </Text>
            </View>
          ))}
        </View>

        {/* Smart Nudges */}
        <Text className="mb-3 text-[17px] font-bold text-ink">Smart Nudges</Text>

        {/* Nudge 1 */}
        <View className="mb-3 overflow-hidden rounded-2xl border border-danger/30 bg-danger-soft p-4">
          <View className="mb-3 flex-row items-center">
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-danger/15">
              <Ionicons name="alert-circle" size={20} color={colors.danger} />
            </View>
            <Text className="flex-1 text-sm text-ink">
              You are ₦50,000 away from your monthly savings goal. You got this!
            </Text>
          </View>
          <TouchableOpacity className="rounded-xl bg-primary py-3">
            <Text className="text-center text-sm font-semibold text-on-primary">Transfer</Text>
          </TouchableOpacity>
        </View>

        {/* Nudge 2 */}
        <View className="mb-4 overflow-hidden rounded-2xl border border-danger/30 bg-danger-soft p-4">
          <View className="mb-3 flex-row items-center">
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-danger/15">
              <Ionicons name="alert-circle" size={20} color={colors.danger} />
            </View>
            <Text className="flex-1 text-sm text-ink">
              You practically save more on Fridays. Consider auto saving ₦20,000 today!
            </Text>
          </View>
          <TouchableOpacity className="rounded-xl bg-primary py-3">
            <Text className="text-center text-sm font-semibold text-on-primary">Set Up</Text>
          </TouchableOpacity>
        </View>

        {/* Personal Challenges */}
        <Text className="mb-3 text-[17px] font-bold text-ink">Personal Challenges</Text>

        {/* Smart Spending Streak */}
        <View className="mb-3 overflow-hidden rounded-2xl bg-primary p-4">
          <View className="mb-2 flex-row items-center">
            <Ionicons name="wallet" size={20} color={colors.onPrimary} />
            <Text className="ml-2 text-base font-semibold text-on-primary">
              Smart Spending Streak
            </Text>
          </View>
          <Text className="mb-3 text-xs text-on-primary/80">
            You saved instead of overspending! Keep the momentum going
          </Text>
          <Text className="mb-2 text-xs text-on-primary/80">Progress</Text>
          <View className="mb-2 h-2 overflow-hidden rounded-full bg-on-primary/30">
            <View className="h-full rounded-full bg-on-primary" style={{ width: '56%' }} />
          </View>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Ionicons name="diamond" size={14} color={colors.onPrimary} />
              <Text className="ml-1 text-sm font-semibold text-on-primary">
                +250 Points rewarded
              </Text>
            </View>
            <Text className="text-xs text-on-primary/80">3 days</Text>
          </View>
        </View>

        {/* Investments Milestone */}
        <View className="mb-4 overflow-hidden rounded-2xl bg-success p-4">
          <View className="mb-2 flex-row items-center">
            <Ionicons name="trending-up" size={20} color={colors.onPrimary} />
            <Text className="ml-2 text-base font-semibold text-on-primary">
              Investments Mile Stone
            </Text>
          </View>
          <Text className="mb-3 text-xs text-on-primary/80">
            Based on your goals, invest ₦500,000 by end of quarter
          </Text>
          <Text className="mb-2 text-xs text-on-primary/80">Progress</Text>
          <View className="mb-2 h-2 overflow-hidden rounded-full bg-on-primary/30">
            <View className="h-full rounded-full bg-on-primary" style={{ width: '56%' }} />
          </View>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Ionicons name="diamond" size={14} color={colors.onPrimary} />
              <Text className="ml-1 text-sm font-semibold text-on-primary">
                +250 Points rewarded
              </Text>
            </View>
            <Text className="text-xs text-on-primary/80">3 days</Text>
          </View>
        </View>

        {/* Daily Mini Games */}
        <Text className="mb-3 text-[17px] font-bold text-ink">Daily Mini Games</Text>

        {/* Budget Blitz */}
        <View
          className="mb-3 overflow-hidden rounded-2xl border border-line bg-card p-4"
          style={shadows.sm}>
          <View className="mb-3 items-center">
            <View className="mb-2 h-16 w-16 items-center justify-center rounded-2xl bg-primary-light">
              <Ionicons name="game-controller" size={32} color={colors.primary} />
            </View>
            <Text className="mb-1 text-[15px] font-semibold text-ink">Budget Blitz</Text>
            <Text className="text-xs text-ink-muted">Test your budgeting skills</Text>
          </View>
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-xs text-ink-muted">3 plays left</Text>
            <View className="flex-row items-center">
              <Ionicons name="diamond" size={14} color={colors.warning} />
              <Text className="ml-1 text-xs font-semibold text-warning">50-300 points</Text>
            </View>
          </View>
          <TouchableOpacity className="rounded-xl bg-primary py-3">
            <Text className="text-center text-sm font-semibold text-on-primary">Play Now</Text>
          </TouchableOpacity>
        </View>

        {/* Savings Spinner */}
        <TouchableOpacity
          onPress={() => {
            navigateTo('spin');
          }}
          className="mb-4 overflow-hidden rounded-2xl border border-line bg-card p-4"
          style={shadows.sm}>
          <View className="mb-3 items-center">
            <View className="mb-2 h-16 w-16 items-center justify-center rounded-2xl bg-primary-light">
              <Ionicons name="disc" size={32} color={colors.primary} />
            </View>
            <Text className="mb-1 text-[15px] font-semibold text-ink">Savings Spinner</Text>
            <Text className="text-xs text-ink-muted">Daily spin to win points</Text>
          </View>
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-xs text-ink-muted">3 plays left</Text>
            <View className="flex-row items-center">
              <Ionicons name="diamond" size={14} color={colors.warning} />
              <Text className="ml-1 text-xs font-semibold text-warning">25-500 points</Text>
            </View>
          </View>
          <TouchableOpacity className="rounded-xl bg-primary py-3">
            <Text className="text-center text-sm font-semibold text-on-primary">Play Now</Text>
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Bottom Spacing */}
        <View className="h-6" />
      </ScrollView>
    </View>
  );
}

// Backend not live yet — renders "Coming soon" until config/features.js enables it.
export default withFeature('rewards', Rewards);
