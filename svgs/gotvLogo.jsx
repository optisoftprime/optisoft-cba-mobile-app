import * as React from 'react';
import Svg, { Path } from 'react-native-svg';

// GOtv logo, converted from assets/gotv-seeklogo-2.svg. This project has
// react-native-svg but NOT react-native-svg-transformer, so .svg files can't be
// imported directly — hence a hand-authored component (same as networkSvg.jsx).
// The source viewBox is a square (652×652) with the wordmark sitting in the
// vertical middle, which makes it render as a thin sliver. This viewBox is
// cropped to the wordmark's actual bounds (art spans x≈-124..475, y≈224..334)
// with margin, so it fills a wide short box like the DSTV/Showmax PNGs do.
export const GotvLogoSvg = (props) => (
  <Svg
    viewBox="-170 205 700 150"
    width={130}
    height={28}
    preserveAspectRatio="xMidYMid meet"
    {...props}>
    <Path
      fill="#008B3B"
      d="M472,255.1h-12.8c-2.3,0-4.3,2.1-4.4,2.2l-48.5,63.5c-0.9,1.2-2.4,1.1-3.2-0.1l-44.8-63.4c0-0.1-1.7-2.2-4.8-2.2h-86c-1.5,0-2.7-1.2-2.7-2.7l0-21c0-3-2.4-5.4-5.4-5.4h-30.1h-4.4h-2.9c-3,0-5.4,2.4-5.4,5.4v2.4V313c0.6,10,7.8,21.2,27.6,21.2h166.1c3.9,0,5.9-2.5,5.9-2.5l56.9-74.8C473.4,256.9,474.6,255.1,472,255.1 M354.9,322.9h-76.7c-10.7,0-13.2-3-13.2-11.3V269c0-1.4,1.1-2.6,2.5-2.7h44.6c1.4,0.1,3.1,0.9,4,2l40,52.5C356.8,322,356.4,322.9,354.9,322.9"
    />
    <Path
      fill="#E30613"
      d="M136.3,224.2L136.3,224.2l-5.5-0.1H128h-5.5v0.1c-54.5,1.6-71.3,27.2-73.5,50.5H30.9h-5.2h-18H6.4h-9h-18.1c-1.4,0.1-2.5,1.2-2.5,2.7v6.8c0,1.4,1.1,2.6,2.5,2.7h18.1v0h7.4c1.5,0.1,2.8,1.3,2.8,2.8l0,0v14.9v0v7.3c-0.9,7.6-7.9,10.3-23.9,10.4c-41.2-1-63.1-18.5-63.1-42.4v0v0c0-24.6,23.1-42.5,66.6-42.5h10.6v0H28c1.4-0.1,2.5-1.2,2.5-2.7v-6.4c0-1.4-1.1-2.6-2.5-2.7H-1.4h-0.7h-21.3c-82.2,0-102.9,29.6-102.9,54.1v0v0c0,24.6,20.7,54.1,102.9,54.1H7.5c16.2,0,27.8-1.2,37-6.5c3.4-2,8.2-5.7,8.9-12h0v-0.1c0-0.4,0.1-0.8,0.1-1.2v-4.1c0.3-2,1.2-2.1,1.4-2.1c0.8-0.1,1.4,0.1,2.6,1.2l0,0c9.8,14.2,29.4,25.5,65,26.6v0.1h5.5h2.8h5.5v-0.1c58.7-1.7,73.7-31.2,73.7-55.9v0v0C210,255.4,195,225.9,136.3,224.2 M129.9,324.7c-18.5,0.2-33.8-19.7-34-44.3c-0.3-24.6,14.6-44.8,33.1-44.9c18.5-0.2,33.7,19.7,34,44.3C163.2,304.4,148.4,324.5,129.9,324.7"
    />
  </Svg>
);
