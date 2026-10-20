import { theme as antdTheme, type ThemeConfig } from 'antd';
import { palettes, type ThemeName } from './palette';

export const FONT_FAMILY =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

interface Options {
  highContrast?: boolean;
  reduceMotion?: boolean;
}

/**
 * Tema AntD costruito dalla palette: valori colore REALI (niente `var()`),
 * algoritmo chiaro/scuro e `cssVar: true`.
 * Raggi concentrici: contenitore 24 → card 16 → controlli 10.
 */
export const buildAntdTheme = (name: ThemeName, { highContrast = false, reduceMotion = false }: Options = {}): ThemeConfig => {
  const p = palettes[name];
  const isDark = name === 'dark';

  const border = highContrast ? p.borderStrong : p.border;
  const borderSecondary = highContrast ? p.borderStrong : p.borderSubtle;
  const textSecondary = highContrast ? p.text : p.textSecondary;
  const textTertiary = highContrast ? p.textSecondary : p.textTertiary;

  return {
    algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    cssVar: true,
    token: {
      colorPrimary: p.primary,
      colorInfo: p.primary,
      colorSuccess: p.success,
      colorWarning: p.warning,
      colorError: p.error,
      colorLink: p.link,
      colorTextBase: p.text,
      colorBgBase: isDark ? p.bgBase : '#FFFFFF',
      // in scuro il primario è chiaro → testo navy sui pulsanti primari (AA)
      colorTextLightSolid: p.onPrimary,

      colorBgLayout: p.bgBase,
      colorBgContainer: p.surface,
      colorBgElevated: p.elevated,
      colorBorder: border,
      colorBorderSecondary: borderSecondary,
      colorSplit: borderSecondary,

      colorText: p.text,
      colorTextHeading: p.text,
      colorTextSecondary: textSecondary,
      colorTextTertiary: textTertiary,
      colorTextDescription: textTertiary,

      fontFamily: FONT_FAMILY,
      borderRadius: 10,
      borderRadiusLG: 16,
      borderRadiusSM: 8,
      borderRadiusXS: 4,
      boxShadowTertiary: p.shadowSm,
      motion: !reduceMotion,
      wireframe: false,
      // in scuro l'algoritmo mescola gli stati con #141414 (grigio neutro): li tingiamo sul navy
      ...(isDark
        ? {
            colorInfoBg: 'rgba(143, 184, 232, 0.12)',
            colorInfoBorder: 'rgba(143, 184, 232, 0.35)',
            colorSuccessBg: 'rgba(92, 196, 138, 0.12)',
            colorSuccessBorder: 'rgba(92, 196, 138, 0.35)',
            colorWarningBg: 'rgba(233, 180, 76, 0.12)',
            colorWarningBorder: 'rgba(233, 180, 76, 0.35)',
            colorErrorBg: 'rgba(255, 107, 117, 0.12)',
            colorErrorBorder: 'rgba(255, 107, 117, 0.35)',
          }
        : {
            // dal navy l'algoritmo ricava uno sfondo info grigio scuro: ghiaccio esplicito
            colorInfoBg: '#EAF1FA',
            colorInfoBorder: '#C3D5EE',
          }),
    },
    components: {
      Layout: {
        bodyBg: 'transparent',
        headerBg: 'transparent',
        siderBg: 'transparent',
        lightSiderBg: 'transparent',
        footerBg: 'transparent',
      },
      Menu: {
        itemBg: 'transparent',
        subMenuItemBg: 'transparent',
        popupBg: p.elevated,
        itemBorderRadius: 10,
        itemSelectedBg: p.selectedBg,
        itemSelectedColor: p.selectedText,
        itemHoverBg: p.hoverBg,
        itemActiveBg: p.selectedBg,
        activeBarBorderWidth: 0,
        activeBarWidth: 0,
        itemMarginInline: 8,
      },
      Card: {
        headerBg: 'transparent',
      },
      Button: {
        primaryShadow: 'none',
        defaultShadow: 'none',
        dangerShadow: 'none',
      },
      Table: {
        headerBg: p.sunken,
        headerSplitColor: 'transparent',
        rowHoverBg: p.hoverBg,
        borderColor: borderSecondary,
        cellPaddingBlock: 14,
        headerBorderRadius: 12,
      },
      Modal: {
        contentBg: p.elevated,
        headerBg: p.elevated,
        footerBg: 'transparent',
        borderRadiusLG: 20,
      },
      Drawer: {
        colorBgElevated: p.elevated,
      },
      Segmented: {
        trackBg: p.sunken,
        itemSelectedBg: p.surface,
        itemSelectedColor: p.text,
      },
      Tabs: {
        itemSelectedColor: p.selectedText,
        inkBarColor: p.primary,
      },
      Avatar: {
        colorTextPlaceholder: p.primary,
      },
    },
  };
};
