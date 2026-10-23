// app/+not-found.jsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function NotFound() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center px-6">
        {/* Icon */}
        <View className="mb-6 h-32 w-32 items-center justify-center rounded-full bg-gray-100">
          <Ionicons name="alert-circle-outline" size={64} color="#9CA3AF" />
        </View>

        {/* Title */}
        <Text className="mb-3 text-center text-2xl font-bold text-gray-900">Page Not Found</Text>

        {/* Description */}
        <Text className="mb-8 text-center text-base text-gray-600">
          Sorry, the page you're looking for doesn't exist or has been moved.
        </Text>

        {/* Home Button */}
        <TouchableOpacity
          onPress={() => router.replace('appLayout')}
          className="mb-3 w-full max-w-xs rounded-lg bg-primary px-6 py-4"
          activeOpacity={0.8}>
          <Text className="text-center text-base font-semibold text-white">Go to Home</Text>
        </TouchableOpacity>

        {/* Back Button */}
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('landingScreen'))}
          className="w-full max-w-xs rounded-lg border border-gray-300 bg-white px-6 py-4"
          activeOpacity={0.8}>
          <Text className="text-center text-base font-semibold text-gray-700">Go Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
