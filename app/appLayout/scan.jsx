// app/(tabs)/scan.jsx
// This screen is never actually rendered — ScanTabButton navigates directly
// to setUpFace without activating this tab. This file just satisfies the router.
import { useEffect } from 'react';
import { navigateTo } from 'app/navigate';

export default function ScanTab() {
  useEffect(() => {
    navigateTo('setUpFace');
  }, []);

  return null;
}
