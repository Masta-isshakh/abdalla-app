import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

type JahzeenLogoProps = {
  size?: number;
  showWordmark?: boolean;
  wordmarkColor?: string;
  subtitleColor?: string;
  style?: StyleProp<ViewStyle>;
};

export function JahzeenLogo({
  size = 72,
  showWordmark = false,
  wordmarkColor = '#0F7B45',
  subtitleColor = '#2A6E48',
  style,
}: JahzeenLogoProps) {
  const markSize = size;
  const accentBarHeight = Math.max(3, Math.round(markSize * 0.07));
  const accentBarGap = Math.max(3, Math.round(markSize * 0.05));
  const strokeWidth = Math.max(3, Math.round(markSize * 0.075));

  return (
    <View style={[logoStyles.container, style]}>
      <LinearGradient
        colors={['#189E59', '#0F7B45', '#0A6339']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          logoStyles.mark,
          {
            width: markSize,
            height: markSize,
            borderRadius: Math.round(markSize * 0.28),
          },
        ]}
      >
        <View
          style={[
            logoStyles.speedLine,
            {
              width: Math.round(markSize * 0.36),
              height: accentBarHeight,
              top: Math.round(markSize * 0.32),
              left: Math.round(markSize * 0.16),
              borderRadius: accentBarHeight,
            },
          ]}
        />
        <View
          style={[
            logoStyles.speedLine,
            {
              width: Math.round(markSize * 0.26),
              height: accentBarHeight,
              top: Math.round(markSize * 0.32 + accentBarHeight + accentBarGap),
              left: Math.round(markSize * 0.12),
              borderRadius: accentBarHeight,
            },
          ]}
        />
        <View
          style={[
            logoStyles.jStroke,
            {
              width: Math.round(markSize * 0.3),
              height: Math.round(markSize * 0.45),
              right: Math.round(markSize * 0.14),
              top: Math.round(markSize * 0.15),
              borderWidth: strokeWidth,
              borderTopLeftRadius: Math.round(markSize * 0.06),
              borderTopRightRadius: Math.round(markSize * 0.12),
              borderBottomLeftRadius: Math.round(markSize * 0.22),
              borderBottomRightRadius: Math.round(markSize * 0.1),
            },
          ]}
        />
        <Text
          style={[
            logoStyles.jLetter,
            {
              fontSize: Math.round(markSize * 0.56),
              lineHeight: Math.round(markSize * 0.56),
              right: Math.round(markSize * 0.11),
              top: Math.round(markSize * 0.04),
            },
          ]}
        >
          J
        </Text>
        <View
          style={[
            logoStyles.swoosh,
            {
              width: Math.round(markSize * 0.44),
              height: Math.round(markSize * 0.18),
              right: Math.round(markSize * 0.07),
              bottom: Math.round(markSize * 0.13),
              borderWidth: strokeWidth,
              borderBottomWidth: strokeWidth,
              borderLeftWidth: strokeWidth,
              borderRightWidth: strokeWidth,
              borderBottomColor: '#F6FFFA',
              borderLeftColor: '#F6FFFA',
              borderRightColor: '#F6FFFA',
              borderTopColor: 'transparent',
              borderTopWidth: 0,
              transform: [{ rotate: '-12deg' }],
            },
          ]}
        />
      </LinearGradient>

      {showWordmark ? (
        <View style={logoStyles.wordmarkStack}>
          <Text style={[logoStyles.wordmarkArabic, { color: wordmarkColor }]}>جاهزين</Text>
          <Text style={[logoStyles.wordmarkEnglish, { color: subtitleColor }]}>JAHEZEEN</Text>
        </View>
      ) : null}
    </View>
  );
}

const logoStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mark: {
    overflow: 'hidden',
    shadowColor: '#0A6339',
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  speedLine: {
    position: 'absolute',
    backgroundColor: '#F7FFF9',
  },
  jStroke: {
    position: 'absolute',
    borderColor: '#F7FFF9',
    borderTopColor: '#F7FFF9',
    borderRightColor: '#F7FFF9',
    borderBottomColor: '#F7FFF9',
    borderLeftColor: 'transparent',
  },
  jLetter: {
    position: 'absolute',
    color: '#FFFFFF',
    fontWeight: '900',
  },
  swoosh: {
    position: 'absolute',
    borderRadius: 999,
    borderColor: '#F7FFF9',
  },
  wordmarkStack: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  wordmarkArabic: {
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 26,
    letterSpacing: 0.2,
  },
  wordmarkEnglish: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 5.5,
  },
});