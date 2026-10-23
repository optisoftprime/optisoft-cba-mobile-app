import { Platform } from 'react-native';
import * as Print from 'expo-print';

// Receipts are laid out for a phone screen. Printed onto expo-print's default
// US Letter page they sit small in the middle of a sheet, and a PDF viewer —
// which fits the page width to the screen — shows them zoomed out. Printing
// onto a receipt-sized page instead makes the PDF open at a readable size.

// The page width as CSS px — about a phone's width, which the templates are
// designed for.
const PAGE_WIDTH_PX = 400;

// expo-print sizes pages in points (1/72 in). Android's WebView prints CSS px
// at 96 per inch, so a point is 4/3 of a CSS px there; iOS prints 1 px = 1 pt.
const PT_PER_PX = Platform.OS === 'android' ? 72 / 96 : 1;

// Room for text that wraps further than the estimate expects (long names,
// the footer); it shows as the receipt's own background margin.
const SLACK_PX = 80;

/**
 * Render a receipt template to a single receipt-sized PDF page.
 *
 *   layout — the template's height estimate: { base, row } in CSS px, where
 *            `base` is everything but the table rows and `row` is one row.
 */
export async function printReceiptPdf(html, layout) {
  const rows = (html.match(/<tr[\s>]/g) || []).length;
  const heightPx = layout.base + rows * layout.row + SLACK_PX;

  return Print.printToFileAsync({
    html,
    base64: false,
    width: Math.round(PAGE_WIDTH_PX * PT_PER_PX),
    height: Math.round(heightPx * PT_PER_PX),
  });
}
