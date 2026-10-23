// components/DataBundlePicker.jsx
//
// Opay-style data bundle picker: a horizontal category filter (Daily / Weekly /
// Monthly / Others) over a 2-column grid of tappable bundle cards. Replaces the
// old single bland dropdown. Categories are derived from the plan names, so it
// works for any network's plan list without extra config.
import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from 'config/ThemeContext';

const CATEGORY_ORDER = ['Daily', 'Weekly', 'Monthly', 'Others'];

// Bucket a plan by its name. Explicit keywords win; otherwise fall back to the
// validity day-count (1–2 → Daily, 3–7 → Weekly, ≤31 → Monthly, else Others).
function planCategory(name = '') {
  const n = name.toLowerCase();
  if (n.includes('monthly')) return 'Monthly';
  if (n.includes('weekly')) return 'Weekly';
  if (n.includes('daily')) return 'Daily';
  const dayMatch = n.match(/(\d+)\s*days?/);
  if (dayMatch) {
    const d = parseInt(dayMatch[1], 10);
    if (d <= 2) return 'Daily';
    if (d <= 7) return 'Weekly';
    if (d <= 31) return 'Monthly';
  }
  return 'Others';
}

// Pull the headline data size out of a plan name, e.g. "1.5GB", "110MB".
function parseSize(name = '') {
  const m = name.match(/([\d.,]+\s?(?:MB|GB|TB))/i);
  return m ? m[1].replace(/\s+/g, '').toUpperCase() : null;
}

// Pull a short validity label, e.g. "(7 Days)" → "7 Days", or a keyword.
function parseValidity(name = '') {
  const paren = name.match(/\(([^)]*\d+[^)]*day[^)]*)\)/i);
  if (paren) return paren[1].trim();
  const days = name.match(/(\d+)\s*days?/i);
  if (days) return `${days[1]} Day${days[1] === '1' ? '' : 's'}`;
  if (/monthly/i.test(name)) return 'Monthly';
  if (/weekly/i.test(name)) return 'Weekly';
  if (/daily/i.test(name)) return 'Daily';
  return null;
}

const formatAmount = (value) => {
  const num = Number(value);
  if (!value || Number.isNaN(num)) return '0';
  return num.toLocaleString('en-NG', { maximumFractionDigits: 0 });
};

export default function DataBundlePicker({ plans = [], selectedCode, onSelect }) {
  const { colors } = useTheme();
  const categories = useMemo(() => {
    const present = new Set(plans.map((p) => planCategory(p.name)));
    return ['All', ...CATEGORY_ORDER.filter((c) => present.has(c))];
  }, [plans]);

  const [active, setActive] = useState('All');

  // Reset to "All" whenever the plan set changes (e.g. a different network).
  useEffect(() => {
    setActive('All');
  }, [plans]);

  const filtered = useMemo(() => {
    if (active === 'All') return plans;
    return plans.filter((p) => planCategory(p.name) === active);
  }, [plans, active]);

  if (!plans.length) return null;

  return (
    <View>
      {/* Category filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
        style={{ marginBottom: 14 }}>
        {categories.map((cat) => {
          const isActive = cat === active;
          return (
            <TouchableOpacity
              key={cat}
              onPress={() => setActive(cat)}
              activeOpacity={0.8}
              style={{
                paddingHorizontal: 18,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: isActive ? colors.primary : colors.cardMuted,
              }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: isActive ? colors.onPrimary : colors.inkMuted,
                }}>
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Bundle grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        {filtered.map((plan) => {
          const isSelected = plan.variation_code === selectedCode;
          const size = parseSize(plan.name);
          const validity = parseValidity(plan.name);
          return (
            <TouchableOpacity
              key={plan.variation_code}
              onPress={() => onSelect(plan)}
              activeOpacity={0.85}
              style={{
                width: '48.5%',
                marginBottom: 12,
                borderRadius: 16,
                paddingHorizontal: 14,
                paddingVertical: 14,
                borderWidth: 1.5,
                borderColor: isSelected ? colors.primary : colors.line,
                backgroundColor: isSelected ? colors.primaryLight : colors.card,
              }}>
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 18,
                  fontWeight: '800',
                  color: isSelected ? colors.primary : colors.ink,
                }}>
                {size ?? plan.name}
              </Text>

              <Text
                numberOfLines={2}
                style={{
                  marginTop: 4,
                  fontSize: 11,
                  lineHeight: 15,
                  color: colors.inkMuted,
                  minHeight: 30,
                }}>
                {size ? plan.name : (validity ?? '')}
              </Text>

              <View
                style={{
                  marginTop: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink }}>
                  ₦{formatAmount(plan.variation_amount)}
                </Text>
                {validity ? (
                  <Text
                    numberOfLines={1}
                    style={{ fontSize: 10, color: colors.inkSoft, maxWidth: '55%' }}>
                    {validity}
                  </Text>
                ) : null}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
