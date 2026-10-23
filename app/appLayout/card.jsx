// app/appLayout/card.jsx — the Card tab. No card backend yet: the tab button is
// gated (config/features.js → cards), and this renders "Coming soon" if reached.
import { useTranslation } from 'react-i18next';

import { ComingSoon } from 'components/layout/coming-soon';

export default function CardTab() {
  const { t } = useTranslation();
  return <ComingSoon title={t('tabs.card')} />;
}
