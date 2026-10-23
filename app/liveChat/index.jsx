// screens/LiveChat.jsx
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { navigateBack } from 'app/navigate';
import Header from 'components/header';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'config/ThemeContext';
import { withFeature } from 'components/layout/coming-soon';

function LiveChat() {
  const { colors } = useTheme();
  const [message, setMessage] = useState('');

  const messages = [
    {
      id: 1,
      text: 'Hello, how can we help you today?',
      isSupport: true,
      time: '10:30 AM',
      date: 'Today',
    },
    {
      id: 2,
      text: 'Lorem ipsum dolor sit amet consectetur. Adipiscing ultrices odio nibh erat curabitur.',
      isSupport: false,
      time: '10:32 AM',
      date: 'Today',
    },
    {
      id: 3,
      text: 'Hello, how can we help you today?',
      isSupport: true,
      time: '10:35 AM',
      date: 'Today',
    },
    {
      id: 4,
      text: 'Lorem ipsum dolor sit amet consectetur. Adipiscing ultrices odio nibh erat curabitur.',
      isSupport: false,
      time: '10:37 AM',
      date: 'Today',
    },
    {
      id: 5,
      text: 'Hello, how can we help you today?',
      isSupport: true,
      time: '10:40 AM',
      date: 'Today',
    },
    {
      id: 6,
      text: 'Lorem ipsum dolor sit amet consectetur. Adipiscing ultrices odio nibh erat curabitur.',
      isSupport: false,
      time: '10:42 AM',
      date: 'Today',
    },
  ];

  const handleSend = () => {
    if (message.trim()) {
      console.log('Sending message:', message);
      setMessage('');
      // Add logic to send message
    }
  };

  const renderMessage = (msg, index, showDate) => (
    <View key={msg.id}>
      {/* Date Separator */}
      {showDate && (
        <View className="mb-4 items-center">
          <View className="rounded-full bg-card-muted px-3 py-1">
            <Text className="text-xs text-ink-muted">{msg.date}</Text>
          </View>
        </View>
      )}

      {/* Message */}
      <View className={`mb-3 flex-row ${msg.isSupport ? 'justify-start' : 'justify-end'}`}>
        {msg.isSupport && (
          <View className="mr-2 h-10 w-10 items-center justify-center rounded-full">
            <Image
              source={require('../../assets/person-3.png')}
              className="h-10 w-10 rounded-full"
            />
          </View>
        )}

        <View className={`max-w-[75%] ${msg.isSupport ? '' : 'items-end'}`}>
          <View
            className={`rounded-2xl px-4 py-3 ${
              msg.isSupport
                ? 'rounded-tl-none border border-line bg-card'
                : 'rounded-tr-none bg-primary'
            }`}>
            <Text className={`text-sm leading-5 ${msg.isSupport ? 'text-ink' : 'text-on-primary'}`}>
              {msg.text}
            </Text>
          </View>
          <Text className="mt-1 text-xs text-ink-soft">{msg.time}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <Header title="Live Chat" onLeftPress={navigateBack} showLeftIcon={true} />

      {/* Messages */}
      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}>
        {messages.map((msg, index) => {
          const showDate = index === 0 || messages[index - 1].date !== msg.date;
          return renderMessage(msg, index, showDate);
        })}
      </ScrollView>

      {/* Input Area */}
      <View className="border-t border-line bg-card px-4 py-3">
        <View className="flex-row items-center">
          <View className="mr-2 flex-1 flex-row items-center rounded-full border border-line bg-card-muted px-4 py-2">
            <TextInput
              className="flex-1 text-sm text-ink"
              placeholder="Type a message..."
              placeholderTextColor={colors.inkSoft}
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={500}
            />
            <TouchableOpacity className="ml-2">
              <Ionicons name="happy-outline" size={22} color={colors.inkSoft} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={handleSend}
            className="h-10 w-10 items-center justify-center rounded-full bg-primary"
            activeOpacity={0.7}>
            <Ionicons name="send" size={18} color={colors.onPrimary} />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// Backend not live yet — renders "Coming soon" until config/features.js enables it.
export default withFeature('liveChat', LiveChat);
