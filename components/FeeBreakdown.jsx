// components/FeeBreakdown.jsx
//
// A DYNAMIC fee box. Instead of hard-coding each fee field, it scans the objects
// it's given and renders EVERY field whose key contains "fee" (case-insensitive)
// and holds a positive numeric value. So the moment the backend starts sending a
// new fee — maintenanceFee, insuranceFee, vatOnManagementFee, whatever — it shows
// up here automatically, with no code change and no new build.
//
// Usage:
//   <FeeBreakdown sources={[item, item.savingProductRes]} />
//
// Pass every object a fee might live on; nested objects are scanned too. Labels
// are generated from the field name (maintenanceFee -> "Maintenance Fee").
import React from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'config/ThemeContext';
import { formatAmount } from 'helper';

// "maintenanceFee" / "vat_on_management_fee" -> "Maintenance Fee" / "VAT On Management Fee"
function humanizeFeeLabel(key) {
  return String(key)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2') // split camelCase
    .replace(/[_-]+/g, ' ') // snake/kebab -> spaces
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase()) // Title Case
    .replace(/\bVat\b/g, 'VAT'); // keep the acronym uppercase
}

// Coerce a value to a positive number, or null if it isn't one.
function toPositiveNumber(raw) {
  if (typeof raw === 'number') return Number.isFinite(raw) && raw > 0 ? raw : null;
  if (typeof raw === 'string' && raw.trim() !== '' && !Number.isNaN(Number(raw))) {
    const n = Number(raw);
    return n > 0 ? n : null;
  }
  return null;
}

// Walk the given objects (one level deep into nested objects) and collect every
// key that looks like a fee and has a positive amount. First value per key wins,
// and any key containing "total" is pushed to the end so a total reads last.
export function collectFees(sources) {
  const list = Array.isArray(sources) ? sources : [sources];
  const seen = new Set();
  const rows = [];

  const scan = (obj, depth) => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return;
    for (const [key, raw] of Object.entries(obj)) {
      if (raw && typeof raw === 'object' && !Array.isArray(raw) && depth < 1) {
        scan(raw, depth + 1); // one level into nested objects (e.g. savingProductRes)
        continue;
      }
      if (!/fee/i.test(key)) continue;
      if (seen.has(key)) continue;
      const amount = toPositiveNumber(raw);
      if (amount == null) continue;
      seen.add(key);
      rows.push({ key, label: humanizeFeeLabel(key), amount, isTotal: /total/i.test(key) });
    }
  };

  for (const src of list) scan(src, 0);
  rows.sort((a, b) => Number(a.isTotal) - Number(b.isTotal));
  return rows;
}

export default function FeeBreakdown({ sources = [], title, style }) {
  const { colors, shadows } = useTheme();
  const { t } = useTranslation();

  const rows = collectFees(sources);
  if (rows.length === 0) return null; // nothing to show until the backend sends fees

  return (
    <View
      style={[
        {
          backgroundColor: colors.cardBackground,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: 16,
          marginTop: 16,
        },
        shadows.sm,
        style,
      ]}>
      <Text
        style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary, paddingVertical: 14 }}>
        {title ?? t('savings.feesTitle')}
      </Text>
      {rows.map((row, i) => (
        <View
          key={row.key}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingVertical: 14,
            borderBottomWidth: i !== rows.length - 1 ? 1 : 0,
            borderBottomColor: colors.border,
          }}>
          <Text style={{ fontSize: 13, color: colors.textSecondary, flex: 1 }}>{row.label}</Text>
          <Text
            style={{
              fontSize: 13,
              fontWeight: row.isTotal ? '800' : '600',
              color: colors.textPrimary,
              textAlign: 'right',
              flex: 1,
            }}
            numberOfLines={2}>
            {formatAmount(row.amount)}
          </Text>
        </View>
      ))}
    </View>
  );
}
