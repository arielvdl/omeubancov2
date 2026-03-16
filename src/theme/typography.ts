export const fonts = {
  regular: "PlusJakartaSans_400Regular",
  medium: "PlusJakartaSans_500Medium",
  semibold: "PlusJakartaSans_600SemiBold",
  bold: "PlusJakartaSans_700Bold",
  extrabold: "PlusJakartaSans_800ExtraBold",
} as const;

export const textStyles = {
  largeTitle: { fontFamily: fonts.extrabold, fontSize: 36, lineHeight: 48 },
  h1: { fontFamily: fonts.extrabold, fontSize: 34, lineHeight: 46 },
  h2: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 40 },
  h3: { fontFamily: fonts.semibold, fontSize: 22, lineHeight: 32 },
  headline: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 26 },
  body: { fontFamily: fonts.regular, fontSize: 17, lineHeight: 28 },
  bodyMedium: { fontFamily: fonts.medium, fontSize: 17, lineHeight: 28 },
  callout: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 26 },
  subhead: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 24 },
  footnote: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20 },
  caption: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18 },
} as const;
