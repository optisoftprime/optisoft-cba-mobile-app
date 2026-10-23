import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Platform,
  TouchableOpacity,
  KeyboardAvoidingView,
  Keyboard,
  BackHandler,
  Alert,
} from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import Header from 'components/header';
import { navigateReplace, navigateBack } from 'app/navigate';
import TouchBtn from 'components/touchBtn';
import TextInputComponent from 'components/textInputs';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'config/ThemeContext';
import Dropdown from 'components/dropDown';
import { GlobalStatusBar } from 'config/statusBar';
import { accountSetup } from 'api/auth';
import Toast from 'react-native-toast-message';
import { trimMessage } from 'helper';
import { formatDOBForApi } from 'utils/dates';
import { save } from 'config/storage';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function PersonalInformation() {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [userName, setUserName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState(null);
  const [gender, setGender] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [bvn, setBvn] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isTitleOpen, setIsTitleOpen] = useState(false);
  const [isGenderOpen, setIsGenderOpen] = useState(false);
  const [maritalStatusOpen, setMaritalStatusOpen] = useState(false);

  const [showDatePicker, setShowDatePicker] = useState(false);

  const [touchedPhone, setTouchedPhone] = useState(false);
  const [touchedEmail, setTouchedEmail] = useState(false);
  const [touchedConfirmPassword, setTouchedConfirmPassword] = useState(false);
  const [touchedBvn, setTouchedBvn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const genderOptions = [
    { label: t('openAccount.genderMale'), value: 'Male' },
    { label: t('openAccount.genderFemale'), value: 'Female' },
    // { label: 'Other', value: 'Other' },
  ];
  const titleOptions = [
    { label: t('openAccount.titleMr'), value: 'Mr' },
    { label: t('openAccount.titleMrs'), value: 'Mrs' },
    { label: t('openAccount.titleMiss'), value: 'Miss' },
    // { label: 'Dr', value: 'Dr' },
    // { label: 'Prof', value: 'Prof' },
  ];

  const maritalStatusOptions = [
    { label: t('openAccount.maritalSingle'), value: 'Single' },
    { label: t('openAccount.maritalMarried'), value: 'Married' },
    { label: t('openAccount.maritalDivorced'), value: 'Divorced' },
    { label: t('openAccount.maritalWidowed'), value: 'Widowed' },
  ];
  const maxDOB = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d;
  }, []);

  const formattedDOB = useMemo(() => {
    if (!dateOfBirth) return '';
    const day = String(dateOfBirth.getDate()).padStart(2, '0');
    const month = String(dateOfBirth.getMonth() + 1).padStart(2, '0');
    const year = dateOfBirth.getFullYear();
    return `${day}/${month}/${year}`;
  }, [dateOfBirth]);

  const dobISO = useMemo(() => {
    if (!dateOfBirth) return '';
    return dateOfBirth.toISOString().split('T')[0];
  }, [dateOfBirth]);

  const phoneError =
    touchedPhone && phoneNumber.length > 0 && phoneNumber.length !== 11
      ? t('openAccount.errorPhoneDigits')
      : '';

  const bvnError =
    touchedBvn && bvn.length > 0 && bvn.length !== 11 ? t('openAccount.errorPhoneDigits') : '';

  const emailError =
    touchedEmail && emailAddress.length > 0 && !EMAIL_REGEX.test(emailAddress)
      ? t('openAccount.errorInvalidEmail')
      : '';

  const confirmPasswordError =
    touchedConfirmPassword && confirmPassword.length > 0 && confirmPassword !== password
      ? t('openAccount.errorPasswordsMismatch')
      : '';

  // isFormValid checks every required field is present and correctly
  // formatted — this is what keeps the Continue button disabled until
  // everything is filled in with valid values (combined with isLoading
  // below via `disabled={!isFormValid || isLoading}` on TouchBtn).
  // NOTE: referralCode is intentionally NOT required.
  const isFormValid = useMemo(() => {
    return (
      firstName.trim().length > 0 &&
      lastName.trim().length > 0 &&
      title.trim().length > 0 &&
      userName.trim().length > 0 &&
      dateOfBirth !== null &&
      gender.length > 0 &&
      bvn.length > 0 &&
      maritalStatus.length > 0 &&
      EMAIL_REGEX.test(emailAddress) &&
      phoneNumber.length === 11 &&
      password.length > 0 &&
      password === confirmPassword
    );
  }, [
    firstName,
    lastName,
    title,
    userName,
    dateOfBirth,
    bvn,
    maritalStatus,
    gender,
    emailAddress,
    phoneNumber,
    password,
    confirmPassword,
  ]);

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (event.type === 'dismissed') return;
    if (selectedDate) setDateOfBirth(selectedDate);
  };

  // Open the date picker. On Android use the IMPERATIVE API — it shows a native
  // dialog without mounting a picker view into the Fabric tree, avoiding the
  // inline-render "child already has a parent" crash class entirely. iOS still
  // renders the inline spinner (it has no imperative equivalent).
  const openDatePicker = () => {
    if (isLoading) return;
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: dateOfBirth || maxDOB,
        onChange: handleDateChange,
        mode: 'date',
        maximumDate: maxDOB,
      });
    } else {
      setShowDatePicker(true);
    }
  };

  // No resume pointer on the FIRST step. Nothing is saved yet here, so bringing
  // the user back to an empty form on relaunch is pointless (QA). Resume only
  // kicks in from stageTwo onward, where onboardingAccountDetails exists. The
  // launch router (app/index.jsx) also ignores any stale 'stageOne' pointer.

  // Navigating away while a TextInput on this screen still has focus is what
  // crashes the app: the keyboard (IME) and, on password fields, the Android
  // autofill PopupWindow stay attached to that input. When react-native-screens
  // tears the outgoing screen down mid-focus, Fabric can't reconcile those
  // still-parented native views and throws:
  //   IllegalStateException: addViewAt: failed to insert view … / The specified
  //   child already has a parent.
  // Fix: blur the focused input (Keyboard.dismiss) FIRST, then defer the actual
  // navigation by two frames so the input has detached its IME + popup before
  // the screen unmounts. Every navigation OFF this screen must go through here.
  const settleThenNavigate = useCallback((navFn) => {
    Keyboard.dismiss();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        navFn();
      });
    });
  }, []);

  const handleCancelConfirm = () => {
    Alert.alert(t('openAccount.leavePageTitle'), t('openAccount.leavePageMessage'), [
      { text: t('openAccount.noStay'), style: 'cancel' },
      {
        text: t('openAccount.yesLeave'),
        style: 'destructive',
        onPress: () => {
          save('appState', null);
          settleThenNavigate(navigateBack);
        },
      },
    ]);
  };

  useFocusEffect(
    useCallback(() => {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        handleCancelConfirm();
        return true;
      });
      return () => backHandler.remove();
    }, [])
  );

  const handleContinue = async () => {
    // Dismiss the keyboard BEFORE we kick off the request / navigation so the
    // focused input detaches its IME + autofill popup (see settleThenNavigate).
    Keyboard.dismiss();
    setIsLoading(true);

    const payload = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      middleName: middleName.trim(),
      email: emailAddress.trim(),
      phoneNumber: phoneNumber.trim(),
      title,
      gender: gender,
      dateOfBirth: formatDOBForApi(new Date(dobISO)),
      maritalStatus,
      password: password,
      userName: userName.trim(),
      bvn: bvn.trim(),
      referralCode: referralCode.trim(),
    };

    console.log(payload, 'craete new account paylaod');
    const response = await accountSetup(payload);

    console.log(response?.ok, response?.data, 'accountDetails response');

    if (response?.ok) {
      save('onboardingAccountDetails', {
        customerAccountDetails: response?.data?.data,
      });
      // Deliberately DO NOT setIsLoading(false) here. Flipping it back would
      // re-render every input on this screen (labels/errors re-added, fields
      // re-enabled, backgrounds swapped) at the exact instant the screen is
      // being torn down for the transition — itself a Fabric reconciliation
      // hazard. Keep the button in its loading state and let the screen unmount.
      settleThenNavigate(() =>
        navigateReplace('stageThree', {
          username: userName.trim(),
          onRegistration: true,
        })
      );
    } else {
      setIsLoading(false);
      Toast.show({
        type: 'error',
        text1:
          response?.message === 'A user already exists with this phone number'
            ? t('openAccount.phoneExistsTitle')
            : t('openAccount.errorOccurredTitle'),
        text2: trimMessage(response?.message),
      });
    }
  };

  // Theme tokens forwarded to the shared TextInputComponent via its public
  // color props (the component itself is not modified).
  const inputColorProps = {
    labelColor: colors.textPrimary,
    textColor: colors.textPrimary,
    placeholderTextColor: colors.textMuted,
    defaultBorderColor: colors.border,
  };

  // Themed dropdown trigger (its internal modal keeps the component's own styling).
  const dropdownTriggerStyle = {
    backgroundColor: colors.cardBackground,
    borderColor: colors.border,
  };

  return (
    <View className="flex-1 bg-background">
      <GlobalStatusBar style={isDark ? 'light-content' : 'dark-content'} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Progress Bar */}
          <View className="px-6 pb-4 pt-12">
            <View className="mt-3 h-2 overflow-hidden rounded-full bg-line">
              <View className="h-full rounded-full bg-primary" style={{ width: '20%' }} />
            </View>
            <Text className="mt-2 text-center text-xs text-ink-muted">
              {t('openAccount.step1of3')}
            </Text>
          </View>

          <Header
            showLeftIcon={true}
            onLeftPress={handleCancelConfirm}
            title={t('openAccount.personalInfoTitle')}
            subtitle={t('openAccount.personalInfoSubtitle')}
            color={colors.textPrimary}
            leftIconColor={colors.textPrimary}
            containerStyle={{ marginTop: -40 }}
          />

          <View className="px-4 pt-2">
            <View className="mb-6">
              <Dropdown
                label={t('openAccount.labelTitle')}
                placeholder={t('openAccount.placeholderSelect')}
                value={title}
                options={titleOptions}
                onSelect={setTitle}
                isOpen={isTitleOpen}
                onToggle={() => !isLoading && setIsTitleOpen(!isTitleOpen)}
                disabled={isLoading}
                triggerStyle={dropdownTriggerStyle}
                triggerTextStyle={{ color: colors.textPrimary }}
                triggerIconColor={colors.textMuted}
              />
            </View>

            <TextInputComponent
              label={t('openAccount.labelFirstName')}
              placeholder={t('openAccount.placeholderFirstName')}
              value={firstName}
              onChangeText={setFirstName}
              isLoading={isLoading}
              containerStyle={{ marginBottom: 24 }}
              {...inputColorProps}
            />

            <TextInputComponent
              label={t('openAccount.labelMiddleName')}
              placeholder={t('openAccount.placeholderMiddleName')}
              value={middleName}
              onChangeText={setMiddleName}
              isLoading={isLoading}
              containerStyle={{ marginBottom: 24 }}
              {...inputColorProps}
            />

            <TextInputComponent
              label={t('openAccount.labelLastName')}
              placeholder={t('openAccount.placeholderLastName')}
              value={lastName}
              onChangeText={setLastName}
              isLoading={isLoading}
              containerStyle={{ marginBottom: 24 }}
              {...inputColorProps}
            />

            <TextInputComponent
              label={t('openAccount.labelUsername')}
              placeholder={t('openAccount.placeholderUsername')}
              value={userName}
              onChangeText={(text) => setUserName(text.replace(/\s/g, ''))}
              autoCapitalize="none"
              autoCorrect={false}
              isLoading={isLoading}
              containerStyle={{ marginBottom: 24 }}
              {...inputColorProps}
            />

            <TextInputComponent
              label={t('openAccount.labelEmail')}
              placeholder={t('openAccount.placeholderEmail')}
              value={emailAddress}
              onChangeText={setEmailAddress}
              onBlur={() => setTouchedEmail(true)}
              keyboardType="email-address"
              autoCapitalize="none"
              error={emailError}
              isLoading={isLoading}
              containerStyle={{ marginBottom: 24 }}
              {...inputColorProps}
            />

            <TextInputComponent
              label={t('openAccount.labelPhone')}
              placeholder={t('openAccount.placeholderPhone')}
              value={phoneNumber}
              onChangeText={(text) => setPhoneNumber(text.replace(/[^0-9]/g, '').slice(0, 11))}
              onBlur={() => setTouchedPhone(true)}
              keyboardType="phone-pad"
              maxLength={11}
              error={phoneError}
              isLoading={isLoading}
              containerStyle={{ marginBottom: 24 }}
              {...inputColorProps}
            />

            <TextInputComponent
              label={t('openAccount.labelBvn')}
              placeholder={t('openAccount.placeholderBvn')}
              value={bvn}
              onChangeText={(text) => setBvn(text.replace(/[^0-9]/g, '').slice(0, 11))}
              onBlur={() => setTouchedBvn(true)}
              keyboardType="phone-pad"
              maxLength={11}
              error={bvnError}
              isLoading={isLoading}
              containerStyle={{ marginBottom: 24 }}
              {...inputColorProps}
            />

            {/* Date of Birth — a read-only trigger, NOT a TextInput. Faking it
                with an editable={false} / pointerEvents="none" TextInput nested
                inside a TouchableOpacity made Fabric double-parent the input
                view (the "child already has a parent" mount crash). A plain
                pressable that shows the value + icon is the correct pattern. */}
            <View style={{ marginBottom: 24 }}>
              <Text className="mb-2 text-[13px] font-semibold text-ink">
                {t('openAccount.labelDob')}
              </Text>
              <TouchableOpacity
                onPress={openDatePicker}
                activeOpacity={0.8}
                disabled={isLoading}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderWidth: 1,
                  borderColor: colors.line,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  backgroundColor: isLoading ? colors.cardMuted : colors.card,
                  opacity: isLoading ? 0.7 : 1,
                }}>
                <Text
                  style={{
                    fontSize: 16,
                    color: formattedDOB ? colors.textPrimary : colors.textMuted,
                  }}>
                  {formattedDOB || t('openAccount.placeholderDob')}
                </Text>
                <MaterialCommunityIcons
                  name="calendar-blank"
                  size={20}
                  color={isLoading ? colors.textMuted : colors.primary}
                />
              </TouchableOpacity>
            </View>

            {/* iOS only — Android uses the imperative DateTimePickerAndroid.open()
                above, so nothing is mounted into the tree on Android. */}
            {Platform.OS === 'ios' && showDatePicker && (
              <DateTimePicker
                value={dateOfBirth || maxDOB}
                mode="date"
                display="spinner"
                maximumDate={maxDOB}
                onChange={handleDateChange}
              />
            )}

            {showDatePicker && Platform.OS === 'ios' && (
              <TouchableOpacity
                onPress={() => setShowDatePicker(false)}
                className="mb-4 items-end pr-1">
                <Text className="text-sm font-semibold text-primary">{t('openAccount.done')}</Text>
              </TouchableOpacity>
            )}

            <Dropdown
              label={t('openAccount.labelMaritalStatus')}
              placeholder={t('openAccount.placeholderMaritalStatus')}
              value={maritalStatus}
              options={maritalStatusOptions}
              onSelect={setMaritalStatus}
              isOpen={maritalStatusOpen}
              onToggle={() => !isLoading && setMaritalStatusOpen(!maritalStatusOpen)}
              disabled={isLoading}
              triggerStyle={dropdownTriggerStyle}
              triggerTextStyle={{ color: colors.textPrimary }}
              triggerIconColor={colors.textMuted}
            />

            <View style={{ marginTop: 15 }}></View>

            <Dropdown
              label={t('openAccount.labelGender')}
              placeholder={t('openAccount.placeholderGender')}
              value={gender}
              options={genderOptions}
              onSelect={setGender}
              isOpen={isGenderOpen}
              onToggle={() => !isLoading && setIsGenderOpen(!isGenderOpen)}
              disabled={isLoading}
              triggerStyle={dropdownTriggerStyle}
              triggerTextStyle={{ color: colors.textPrimary }}
              triggerIconColor={colors.textMuted}
            />

            <View className="mt-6">
              <TextInputComponent
                label={t('openAccount.labelPassword')}
                placeholder={t('openAccount.placeholderPassword')}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                showPasswordToggle
                onToggleSecureTextEntry={() => setShowPassword(!showPassword)}
                isLoading={isLoading}
                containerStyle={{ marginBottom: 24 }}
                {...inputColorProps}
              />

              <TextInputComponent
                label={t('openAccount.labelConfirmPassword')}
                placeholder={t('openAccount.placeholderConfirmPassword')}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                onBlur={() => setTouchedConfirmPassword(true)}
                secureTextEntry={!showConfirmPassword}
                showPasswordToggle
                onToggleSecureTextEntry={() => setShowConfirmPassword(!showConfirmPassword)}
                error={confirmPasswordError}
                isLoading={isLoading}
                containerStyle={{ marginBottom: 24 }}
                {...inputColorProps}
              />

              {/* Referral code — optional. Spaces stripped; not part of isFormValid. */}
              <TextInputComponent
                label={t('openAccount.labelReferralCode')}
                placeholder={t('openAccount.placeholderReferralCode')}
                value={referralCode}
                onChangeText={(text) => setReferralCode(text.replace(/\s/g, ''))}
                autoCapitalize="none"
                autoCorrect={false}
                isLoading={isLoading}
                containerStyle={{ marginBottom: 24 }}
                {...inputColorProps}
              />
            </View>
          </View>

          <View className="px-4 pt-3">
            <TouchBtn
              onPress={handleContinue}
              label={t('openAccount.continue')}
              isLoading={isLoading}
              loadingText={t('openAccount.settingUpAccount')}
              backgroundColor={colors.primary}
              disabled={!isFormValid || isLoading}
              textClassName="text-base font-bold"
              buttonClassName="w-full items-center rounded-xl py-4 px-4"
              containerClassName=""
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
