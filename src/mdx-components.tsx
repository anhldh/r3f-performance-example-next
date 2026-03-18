import { useMDXComponents as getThemeComponents } from "nextra-theme-docs";

// Lấy toàn bộ các thẻ UI mặc định của Nextra (như bảng, block code, heading...)
const themeComponents = getThemeComponents();

export function useMDXComponents(components: any) {
  return {
    ...themeComponents,
    ...components,
  };
}
