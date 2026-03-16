/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#f5e63d",
          50: "#fefce8",
          100: "#fdf9c4",
          200: "#fbf08b",
          300: "#f8e449",
          400: "#f5e63d",
          500: "#e5c60a",
          600: "#c59d06",
          700: "#9e7209",
          800: "#825a10",
          900: "#6e4a13",
        },
        background: {
          light: "#f8f8f5",
          dark: "#222110",
        },
        surface: {
          DEFAULT: "#ffffff",
          dark: "#2a2a1a",
        },
        text: {
          DEFAULT: "#1a1a0e",
          secondary: "#6b6b5a",
          light: "#ffffff",
        },
        border: {
          DEFAULT: "#e5e5d8",
          dark: "#3a3a2a",
        },
        success: "#22c55e",
        danger: "#ef4444",
        warning: "#f59e0b",
        info: "#3b82f6",
      },
      fontFamily: {
        sans: ["PlusJakartaSans_400Regular"],
        "sans-medium": ["PlusJakartaSans_500Medium"],
        "sans-semibold": ["PlusJakartaSans_600SemiBold"],
        "sans-bold": ["PlusJakartaSans_700Bold"],
        "sans-extrabold": ["PlusJakartaSans_800ExtraBold"],
      },
      borderRadius: {
        DEFAULT: "0.75rem",
        lg: "1rem",
        xl: "1.25rem",
        "2xl": "1.5rem",
        "3xl": "1.75rem",
      },
      spacing: {
        4.5: "1.125rem",
        5.5: "1.375rem",
        7: "1.75rem",
        9: "2.25rem",
        11: "2.75rem",
        13: "3.25rem",
      },
    },
  },
  plugins: [],
};
