// screens/CreateTicket.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, ScrollView, Image, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';
import { navigateBack } from 'app/navigate';
import Header from 'components/header';
import TouchBtn from 'components/touchBtn';
import Dropdown from 'components/dropDown';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'config/ThemeContext';
import { createSupportTicket } from 'api/userProfile';
import { getTicketCategories } from 'api/support';
import { pokeTicketWatcher } from 'components/useTicketReplyWatcher';
import { getUser } from 'config/storage';

// ticketCategory is a FIXED backend enum — the deserializer only accepts these
// exact values, so it is NOT derived from the categories list (those feed
// categoryId instead). Label shown to the user is "Issue Type". Labels are built
// from t() below so they localise; the `value` stays the fixed backend enum.
const TICKET_CATEGORY_VALUES = [
  { labelKey: 'tickets.issueAccountDispute', value: 'Account_Dispute' },
  { labelKey: 'tickets.issueTransactionDispute', value: 'Transaction_Dispute' },
  { labelKey: 'tickets.issueFraudReporting', value: 'Fraud_Reporting' },
  { labelKey: 'tickets.issueGeneralEnquiry', value: 'General_Enquiry' },
];

// Priority enums accepted by the backend.
const PRIORITY_VALUES = [
  { labelKey: 'tickets.priorityLow', value: 'LOW' },
  { labelKey: 'tickets.priorityMedium', value: 'MEDIUM' },
  { labelKey: 'tickets.priorityHigh', value: 'HIGH' },
  { labelKey: 'tickets.priorityCritical', value: 'CRITICAL' },
];

export default function CreateTicket() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const TICKET_CATEGORY_OPTIONS = useMemo(
    () => TICKET_CATEGORY_VALUES.map((o) => ({ label: t(o.labelKey), value: o.value })),
    [t]
  );
  const PRIORITY_OPTIONS = useMemo(
    () => PRIORITY_VALUES.map((o) => ({ label: t(o.labelKey), value: o.value })),
    [t]
  );

  const [subject, setSubject] = useState('');
  const [ticketCategory, setTicketCategory] = useState(''); // fixed enum
  const [ticketCategoryOpen, setTicketCategoryOpen] = useState(false);
  const [categoryId, setCategoryId] = useState(null); // ticket category id
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [priority, setPriority] = useState('MEDIUM'); // sensible default
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [imageMimeType, setImageMimeType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Prefilled behind the scenes — sent with the ticket, not user-editable.
  const [phoneNumber, setPhoneNumber] = useState('');
  const [reporterName, setReporterName] = useState('');

  // ── Ticket categories feed the categoryId dropdown ──────────────────────────
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['ticketCategories'],
    queryFn: async () => {
      const res = await getTicketCategories();
      if (res?.ok && Array.isArray(res.data?.data)) return res.data.data;
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const categoryOptions = useMemo(
    () => categories.map((c) => ({ label: c.name, value: c.id })),
    [categories]
  );

  useEffect(() => {
    async function loadUser() {
      const user = await getUser();
      if (user?.mobilePhone) setPhoneNumber(user.mobilePhone);

      // reporterName is the account holder's name; fall back to the username.
      const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
      setReporterName(user?.accountName || fullName || user?.username || '');
    }
    loadUser();
  }, []);

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // NOTE: No permission request needed on Android 13+.
  // launchImageLibraryAsync uses the system photo picker which requires no
  // READ_MEDIA_IMAGES permission — removing requestMediaLibraryPermissionsAsync
  // prevents Google Play from flagging restricted permissions in your build.
  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets?.length > 0) {
      const asset = result.assets[0];
      const extension = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpeg';
      const mimeType = extension === 'png' ? 'image/png' : 'image/jpeg';

      setImageUri(asset.uri);
      setImageBase64(asset.base64 ?? '');
      setImageMimeType(mimeType);
    }
  };

  const handleRemoveImage = () => {
    setImageUri('');
    setImageBase64('');
    setImageMimeType('');
  };

  const handleSubmit = async () => {
    if (
      !subject.trim() ||
      !ticketCategory ||
      categoryId == null ||
      !priority ||
      !description.trim()
    ) {
      Toast.show({
        type: 'error',
        text1: t('tickets.missingFieldsTitle'),
        text2: t('tickets.missingFieldsMessage'),
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        subject: subject.trim(),
        ticketCategory,
        imageUrl: imageBase64 ?? '',
        phoneNumber,
        reporterName,
        priority,
        categoryId,
        description: description.trim(),
      };

      const result = await createSupportTicket(null, payload);

      if (result.ok) {
        Toast.show({
          type: 'success',
          text1: t('tickets.submittedTitle'),
          text2: t('tickets.submittedMessage'),
        });
        // Refresh the tickets list, then return to it. Poke the reply watcher so
        // it leaves its idle heartbeat and starts actively watching this new
        // open ticket right away.
        queryClient.invalidateQueries({ queryKey: ['tickets'] });
        pokeTicketWatcher();
        navigateBack();
      } else {
        Toast.show({
          type: 'error',
          text1: t('tickets.submissionFailedTitle'),
          text2: result.message || t('tickets.submissionFailedMessage'),
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('tickets.submissionFailedTitle'),
        text2: error?.message || t('tickets.submitErrorMessage'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <Header title={t('tickets.createTitle')} onLeftPress={navigateBack} showLeftIcon={true} />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 32 }}>
        {/* ── Profile hero ─────────────────────────────────────────────────── */}
        <View className="px-5 pt-4">
          <LinearGradient
            colors={[colors.panelFrom, colors.panelTo]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 24, padding: 20 }}>
            <View className="flex-row items-center">
              {/* Avatar */}
              <View className="h-[60px] w-[60px] items-center justify-center rounded-full border-[1.5px] border-on-panel/35 bg-on-panel/15">
                {reporterName ? (
                  <Text className="text-[22px] font-extrabold text-on-panel">
                    {getInitials(reporterName)}
                  </Text>
                ) : (
                  <Ionicons name="person" size={28} color={colors.onPanel} />
                )}
              </View>

              {/* Name + phone */}
              <View className="ml-4 flex-1">
                <Text numberOfLines={1} className="text-[18px] font-bold text-on-panel">
                  {reporterName || t('tickets.loadingName')}
                </Text>
                {phoneNumber ? (
                  <View className="mt-1 flex-row items-center">
                    <Ionicons
                      name="call-outline"
                      size={13}
                      color={colors.onPanel}
                      style={{ opacity: 0.85 }}
                    />
                    <Text className="ml-[5px] text-[13px] text-on-panel/85">{phoneNumber}</Text>
                  </View>
                ) : null}
              </View>

              <Ionicons
                name="headset-outline"
                size={26}
                color={colors.onPanel}
                style={{ opacity: 0.9 }}
              />
            </View>

            {/* Divider */}
            <View className="my-4 h-px bg-on-panel/20" />

            <Text className="text-[13px] leading-[19px] text-on-panel/90">
              {t('tickets.heroDescription')}
            </Text>
          </LinearGradient>
        </View>

        {/* ── Form ─────────────────────────────────────────────────────────── */}
        <View className="px-5 pt-6">
          {/* Subject */}
          <View className="mb-4">
            <Text className="mb-2 text-sm font-semibold text-ink">
              {t('tickets.subjectLabel')} <Text className="text-danger">*</Text>
            </Text>
            <TextInput
              className="rounded-xl border border-line bg-card px-4 py-3 text-base text-ink"
              value={subject}
              onChangeText={setSubject}
              placeholder={t('tickets.subjectPlaceholder')}
              placeholderTextColor={colors.inkSoft}
              editable={!isSubmitting}
              maxLength={120}
              style={{ opacity: isSubmitting ? 0.6 : 1 }}
            />
          </View>

          {/* Issue Type (fixed enum → ticketCategory) */}
          <Dropdown
            label={t('tickets.issueTypeLabel')}
            placeholder={t('tickets.issueTypePlaceholder')}
            value={ticketCategory}
            options={TICKET_CATEGORY_OPTIONS}
            onSelect={setTicketCategory}
            isOpen={ticketCategoryOpen}
            onToggle={() => setTicketCategoryOpen((prev) => !prev)}
            isLoading={isSubmitting}
            style={{ marginBottom: 16 }}
          />

          {/* Category (ticket categories → categoryId) */}
          <Dropdown
            label={t('tickets.categoryLabel')}
            placeholder={
              categoriesLoading ? t('tickets.categoriesLoading') : t('tickets.categoryPlaceholder')
            }
            value={categoryId}
            options={categoryOptions}
            onSelect={setCategoryId}
            isOpen={categoryOpen}
            onToggle={() => setCategoryOpen((prev) => !prev)}
            isLoading={isSubmitting || categoriesLoading}
            search
            style={{ marginBottom: 16 }}
          />

          {/* Priority */}
          <Dropdown
            label={t('tickets.priorityLabel')}
            placeholder={t('tickets.priorityPlaceholder')}
            value={priority}
            options={PRIORITY_OPTIONS}
            onSelect={setPriority}
            isOpen={priorityOpen}
            onToggle={() => setPriorityOpen((prev) => !prev)}
            isLoading={isSubmitting}
            style={{ marginBottom: 16 }}
          />

          {/* Image Picker */}
          <View className="mb-4">
            <Text className="mb-2 text-sm font-semibold text-ink">{t('tickets.imageLabel')}</Text>

            {imageUri ? (
              <View className="relative overflow-hidden rounded-2xl border border-line">
                <Image
                  source={{ uri: imageUri }}
                  style={{ width: '100%', height: 180 }}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  onPress={handleRemoveImage}
                  disabled={isSubmitting}
                  className="absolute right-2 top-2 rounded-full bg-ink/60 p-1"
                  activeOpacity={0.8}>
                  <Ionicons name="close" size={18} color={colors.card} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handlePickImage}
                disabled={isSubmitting}
                activeOpacity={0.8}
                className="items-center justify-center rounded-2xl border border-dashed border-line bg-card py-8"
                style={{ opacity: isSubmitting ? 0.6 : 1 }}>
                <View className="h-12 w-12 items-center justify-center rounded-xl bg-primary-light">
                  <Ionicons name="image-outline" size={24} color={colors.primary} />
                </View>
                <Text className="mt-2 text-sm text-ink-muted">{t('tickets.imagePickerHint')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Description */}
          <View className="mb-6">
            <Text className="mb-2 text-sm font-semibold text-ink">
              {t('tickets.descriptionLabel')} <Text className="text-danger">*</Text>
            </Text>
            <TextInput
              className="rounded-xl border border-line bg-card px-4 py-3 text-base text-ink"
              value={description}
              onChangeText={setDescription}
              placeholder={t('tickets.descriptionPlaceholder')}
              placeholderTextColor={colors.inkSoft}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              editable={!isSubmitting}
              style={{ minHeight: 120, opacity: isSubmitting ? 0.6 : 1 }}
            />
          </View>

          <TouchBtn
            onPress={() => {
              handleSubmit();
            }}
            label={t('tickets.submit')}
            icon={<Ionicons name="paper-plane-outline" size={16} color={colors.onPrimary} />}
            textClassName="text-base font-semibold"
            textColor={colors.onPrimary}
            loadingColor={colors.onPrimary}
            buttonClassName="items-center rounded-xl py-4"
            activeOpacity={0.8}
            containerClassName=""
            isLoading={isSubmitting}
          />
        </View>
      </ScrollView>
    </View>
  );
}
