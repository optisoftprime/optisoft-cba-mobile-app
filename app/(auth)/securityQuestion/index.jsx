// screens/SecurityQuestions.jsx
import React, { useEffect, useState } from 'react';
import { View, ScrollView, Platform, KeyboardAvoidingView, Keyboard } from 'react-native';
import Header from 'components/header';
import { navigateBack } from 'app/navigate';
import TouchBtn from 'components/touchBtn';
import { getSecurityQuestions, setSecurityQuestions } from 'api/auth';
import { useLocalSearchParams } from 'expo-router';
import { getUserLogs } from 'config/storage';
import { GlobalStatusBar } from 'config/statusBar';
import { useTheme } from 'config/ThemeContext';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import TextInputComponent from 'components/textInputs';
import { useQuery } from '@tanstack/react-query';

export default function SecurityQuestions() {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const [question1, setQuestion1] = useState('');
  const [answer1, setAnswer1] = useState('');
  const [question2, setQuestion2] = useState('');
  const [answer2, setAnswer2] = useState('');

  const [question3, setQuestion3] = useState('');
  const [answer3, setAnswer3] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [userName, setUserName] = useState(null);

  const params = useLocalSearchParams();

  console.log('Username:', userName);

  // getSecurityQuestions

  const isFormReady =
    question1.trim() &&
    answer1.trim() &&
    question2.trim() &&
    answer2.trim() &&
    question3.trim() &&
    answer3.trim();

  const { data: questionsData, isFetching: isFetchingQuestions } = useQuery({
    queryKey: ['securityQuestions'],
    queryFn: async () => {
      try {
        const response = await getSecurityQuestions();
        // React Query does not allow `undefined` to be returned.
        // Always fall back to `null` (or an empty array) if the shape
        // isn't what we expect.
        return response?.data?.data ?? null;
      } catch (error) {
        console.log('Error fetching security questions:', error);
        return null;
      }
    },
    retry: false,
  });

  console.log(questionsData, 'questionsData');

  useEffect(() => {
    const loadUser = async () => {
      const user = await getUserLogs();
      setUserName(user?.username);
      console.log(user, 'user. in questions');

      // Example
      // setUser(user);
    };

    loadUser();
  }, []);

  const handleContinue = async () => {
    // Dismiss keyboard before navigating — avoids the Fabric "child already has a parent" crash on teardown.
    Keyboard.dismiss();
    const selected = [
      question1.trim().toLowerCase(),
      question2.trim().toLowerCase(),
      question3.trim().toLowerCase(),
    ];
    if (new Set(selected).size !== 3) {
      Toast.show({
        type: 'error',
        text1: t('security.duplicateQuestionsTitle'),
        text2: t('security.duplicateQuestionsMessage'),
      });
      return;
    }
    setIsLoading(true);

    const response = await setSecurityQuestions(userName, {
      questions: [
        {
          question: question1.trim().toLowerCase(),
          answer: answer1.trim().toLowerCase(),
        },
        {
          question: question2.trim().toLowerCase(),
          answer: answer2.trim().toLowerCase(),
        },
        {
          question: question3.trim().toLowerCase(),
          answer: answer3.trim().toLowerCase(),
        },
      ],
    });

    if (response?.ok) {
      Toast.show({
        type: 'success',
        text1: t('security.savedTitle'),
        text2: t('security.savedMessage'),
      });
      // Security questions are set post-login from an in-app button, so just
      // return to the screen the user came from (not the app root).
      navigateBack();
    } else {
      Toast.show({
        type: 'error',
        text1: t('security.failedTitle'),
        text2: response?.message || t('security.somethingWentWrong'),
      });
    }

    setIsLoading(false);
  };

  return (
    <View className="flex-1 bg-background">
      <GlobalStatusBar style={isDark ? 'light-content' : 'dark-content'} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}>
          <Header
            title={t('security.secureAccessTitle')}
            onLeftPress={navigateBack}
            showLeftIcon={true}
            color={colors.ink}
            subtitle={t('security.secureAccessSubtitle')}
          />

          <View className="flex-1 px-5 pt-2">
            <TextInputComponent
              label={t('security.questionLabel', { number: 1 })}
              value={question1}
              onChangeText={setQuestion1}
              placeholder={t('security.questionPlaceholder')}
              isLoading={isLoading}
            />
            <TextInputComponent
              label={t('security.answerLabel', { number: 1 })}
              value={answer1}
              onChangeText={setAnswer1}
              placeholder={t('security.answerPlaceholder')}
              isLoading={isLoading}
            />

            <TextInputComponent
              label={t('security.questionLabel', { number: 2 })}
              value={question2}
              onChangeText={setQuestion2}
              placeholder={t('security.questionPlaceholder')}
              isLoading={isLoading}
            />
            <TextInputComponent
              label={t('security.answerLabel', { number: 2 })}
              value={answer2}
              onChangeText={setAnswer2}
              placeholder={t('security.answerPlaceholder')}
              isLoading={isLoading}
            />

            <TextInputComponent
              label={t('security.questionLabel', { number: 3 })}
              value={question3}
              onChangeText={setQuestion3}
              placeholder={t('security.questionPlaceholder')}
              isLoading={isLoading}
            />
            <TextInputComponent
              label={t('security.answerLabel', { number: 3 })}
              value={answer3}
              onChangeText={setAnswer3}
              placeholder={t('security.answerPlaceholder')}
              isLoading={isLoading}
            />
          </View>

          <View className="px-5 pb-6 pt-4">
            <TouchBtn
              onPress={handleContinue}
              isLoading={isLoading}
              loadingText={t('security.pleaseWait')}
              disabled={!isFormReady}
              label={t('security.continue')}
              textClassName="text-base font-semibold"
              buttonClassName="items-center rounded-xl py-4"
              activeOpacity={0.8}
              containerClassName=""
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
