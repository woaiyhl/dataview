// Ant Design v5 Theme Configuration
export const themeConfig = {
  token: {
    colorPrimary: "#3E513E",
    colorSuccess: "#5E7C5E",
    colorWarning: "#D4C5A9",
    colorTextBase: "#2C3E2C",
    colorBgLayout: "#F9F8F4",
    borderRadius: 12,
    wireframe: false,
    fontFamily:
      "'Inter', 'Playfair Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  components: {
    Layout: {
      colorBgHeader: "#FFFFFF",
      colorBgBody: "#F9F8F4",
    },
    Card: {
      colorBgContainer: "#FFFFFF",
      boxShadowTertiary: "0 4px 20px 0 rgba(62, 81, 62, 0.05)",
    },
    Button: {
      borderRadius: 8,
      fontFamily: "'Inter', sans-serif",
      fontWeight: 500,
    },
    Typography: {
      fontFamilyCode: "'Playfair Display', serif",
    },
  },
};
