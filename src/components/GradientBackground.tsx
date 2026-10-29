import React, { useRef } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

let gradientCounter = 0;

export default function GradientBackground({ colors }: { colors: string[] }) {
  const idRef = useRef(`grad${gradientCounter++}`);
  const id = idRef.current;
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          {colors.map((c, i) => (
            <Stop key={i} offset={i / (colors.length - 1)} stopColor={c} />
          ))}
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}
