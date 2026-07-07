export const palette = {
  blue100: "#EBF0FB",
  blue300: "#7A9DD6",
  blue500: "#2E5AAC",
  blue700: "#1C3C75",

  grey50: "#F8F9FA",
  grey100: "#F1F3F5",
  grey200: "#E9ECEF",
  grey300: "#DEE2E6",
  grey400: "#CED4DA",
  grey500: "#ADB5BD",
  grey600: "#6C757D",
  grey700: "#495057",
  grey800: "#343A40",
  grey900: "#212529",

  white: "#FFFFFF",
  black: "#000000",

  red400: "#F06565",
  red500: "#E84040",
  red600: "#D93535",
  green400: "#4CAF50",
  orange400: "#FF9800",
} as const;

export interface ColorTokens {
  background: {
    primary: string;
    secondary: string;
    tertiary: string;
  };
  surface: {
    default: string;
    raised: string;
    overlay: string;
  };
  text: {
    primary: string;
    secondary: string;
    disabled: string;
    inverse: string;
  };
  border: {
    default: string;
    strong: string;
  };
  accent: {
    primary: string;
    primaryLight: string;
    primaryDark: string;
  };
  status: {
    error: string;
    success: string;
    warning: string;
  };
}

export const lightTokens: ColorTokens = {
  background: {
    primary: palette.white,
    secondary: palette.grey50,
    tertiary: palette.grey100,
  },
  surface: {
    default: palette.white,
    raised: palette.white,
    overlay: "rgba(0,0,0,0.4)",
  },
  text: {
    primary: palette.grey900,
    secondary: palette.grey600,
    disabled: palette.grey400,
    inverse: palette.white,
  },
  border: {
    default: palette.grey300,
    strong: palette.grey400,
  },
  accent: {
    primary: palette.blue500,
    primaryLight: palette.blue100,
    primaryDark: palette.blue700,
  },
  status: {
    error: palette.red500,
    success: palette.green400,
    warning: palette.orange400,
  },
};

export const darkTokens: ColorTokens = {
  background: {
    primary: palette.grey900,
    secondary: palette.grey800,
    tertiary: palette.grey700,
  },
  surface: {
    default: palette.grey800,
    raised: palette.grey700,
    overlay: "rgba(0,0,0,0.6)",
  },
  text: {
    primary: palette.grey50,
    secondary: palette.grey400,
    disabled: palette.grey600,
    inverse: palette.grey900,
  },
  border: {
    default: palette.grey500,
    strong: palette.grey400,
  },
  accent: {
    primary: palette.blue300,
    primaryLight: "#1A2A4A",
    primaryDark: palette.blue100,
  },
  status: {
    error: palette.red400,
    success: palette.green400,
    warning: palette.orange400,
  },
};
