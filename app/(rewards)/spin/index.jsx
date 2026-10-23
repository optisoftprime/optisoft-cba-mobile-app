// screens/SavingsSpinner.jsx
import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { navigateBack } from 'app/navigate';
import Header from 'components/header';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'config/ThemeContext';
import Svg, { Path, Circle, G, Text as SvgText } from 'react-native-svg';
import { withFeature } from 'components/layout/coming-soon';

function SavingsSpinner() {
  const { colors } = useTheme();
  const [isSpinning, setIsSpinning] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Segment colours come from the theme so the wheel follows the brand and
  // both light/dark palettes; labels sit on them in the on-primary colour.
  const prizes = [
    { label: '10 Points', color: colors.primary },
    { label: '50 Points', color: colors.warning },
    { label: '30 Points', color: colors.primaryDark },
    { label: '5 Points', color: colors.success },
    { label: '20 Points', color: colors.info },
    { label: '100 Points', color: colors.danger },
  ];

  const handleSpin = () => {
    if (isSpinning) return;

    setIsSpinning(true);

    // Random spins between 5-10 full rotations plus random segment
    const randomDegree = Math.floor(Math.random() * 360);
    const fullRotations = 5 + Math.floor(Math.random() * 5);
    const totalDegrees = fullRotations * 360 + randomDegree;

    Animated.timing(rotateAnim, {
      toValue: totalDegrees,
      duration: 3000,
      useNativeDriver: true,
    }).start(() => {
      setIsSpinning(false);
      // Determine which prize was won based on final position
      const segmentAngle = 360 / prizes.length;
      const normalizedDegree = randomDegree % 360;
      const wonIndex = Math.floor((360 - normalizedDegree) / segmentAngle) % prizes.length;
      console.log('Won:', prizes[wonIndex].label);
    });
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View className="flex-1 bg-background">
      <Header title="Savings Spinner" onLeftPress={navigateBack} showLeftIcon={true} />

      <View className="flex-1 items-center px-6 pt-4">
        {/* Subtitle */}
        <Text className="mb-8 text-center text-sm text-ink-muted">Spin daily to win points</Text>

        {/* Spinner Wheel */}
        <View className="mb-12 items-center justify-center">
          {/* Arrow Pointer */}
          <View className="absolute -top-8 z-10">
            <Ionicons name="caret-down" size={40} color={colors.ink} />
          </View>

          <Animated.View style={{ transform: [{ rotate: rotation }] }}>
            <Svg width="280" height="280" viewBox="0 0 280 280">
              {/* Outer golden ring */}
              <Circle cx="140" cy="140" r="138" fill={colors.warning} />
              <Circle cx="140" cy="140" r="130" fill={colors.card} />

              {/* Wheel segments */}
              <G rotation="0" origin="140, 140">
                {prizes.map((prize, index) => {
                  const angle = (360 / prizes.length) * index;
                  const nextAngle = (360 / prizes.length) * (index + 1);
                  const startAngle = (angle - 90) * (Math.PI / 180);
                  const endAngle = (nextAngle - 90) * (Math.PI / 180);

                  const x1 = 140 + 130 * Math.cos(startAngle);
                  const y1 = 140 + 130 * Math.sin(startAngle);
                  const x2 = 140 + 130 * Math.cos(endAngle);
                  const y2 = 140 + 130 * Math.sin(endAngle);

                  const pathData = `M 140 140 L ${x1} ${y1} A 130 130 0 0 1 ${x2} ${y2} Z`;

                  return (
                    <G key={index}>
                      <Path d={pathData} fill={prize.color} />
                      <SvgText
                        x={140 + 80 * Math.cos((angle + 30 - 90) * (Math.PI / 180))}
                        y={140 + 80 * Math.sin((angle + 30 - 90) * (Math.PI / 180))}
                        fill={colors.onPrimary}
                        fontSize="14"
                        fontWeight="600"
                        textAnchor="middle"
                        transform={`rotate(${angle + 30}, ${140 + 80 * Math.cos((angle + 30 - 90) * (Math.PI / 180))}, ${140 + 80 * Math.sin((angle + 30 - 90) * (Math.PI / 180))})`}>
                        {prize.label}
                      </SvgText>
                    </G>
                  );
                })}
              </G>

              {/* Center circle */}
              <Circle cx="140" cy="140" r="20" fill={colors.card} />
              <Circle cx="140" cy="140" r="15" fill={colors.warning} />
            </Svg>
          </Animated.View>
        </View>

        {/* Spin Button */}
        <TouchableOpacity
          onPress={handleSpin}
          disabled={isSpinning}
          className="w-full rounded-xl py-4"
          style={{ backgroundColor: colors.primary, opacity: isSpinning ? 0.6 : 1 }}
          activeOpacity={0.8}>
          <Text className="text-center text-base font-semibold text-on-primary">
            {isSpinning ? 'Spinning...' : 'Spin The Wheel'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Backend not live yet — renders "Coming soon" until config/features.js enables it.
export default withFeature('rewards', SavingsSpinner);
