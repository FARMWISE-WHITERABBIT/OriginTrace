---
name: i18n
description: >
  Use this skill when adding new translatable strings, creating a new locale,
  building locale-aware components, or working with next-intl. Triggers for
  any mention of "translation", "i18n", "internationalisation", "add a locale",
  "French translation", "messages folder", "next-intl", "useTranslations",
  "locale-aware", or "language switcher". Always use this skill before adding
  any user-facing text to avoid hardcoded strings that can't be translated.
---

# i18n Skill

# Internationalization (i18n) Skill

## 1. Overview

**Mission:** OriginTrace is used by field agents and buyers globally. We support three primary locales: English (`en`), French (`fr`), and Arabic (`ar`).

---

## 2. Implementation (`messages/`)

Translations are stored as JSON files in the `messages/` directory.
- `en.json`: Source of truth for all keys.
- `fr.json`: French translation (West African regions).
- `ar.json`: Arabic translation (North African / Middle Eastern markets).

---

## 3. Common Patterns

OriginTrace uses `next-intl` for translatable strings.
- **Client Components**: Use the `useTranslations` hook.
- **Server Components**: Use `getTranslations`.

```typescript
const t = useTranslations('Farms');
return <h1>{t('title')}</h1>;
```

---

## 4. Best Practices

- **Key Naming**: Use PascalCase for namespaces and camelCase for individual keys (e.g., `Farms.addFarmButton`).
- **Interpolation**: Use curly braces for variables: `t('welcome', { name: 'Adebayo' })`.
- **RTL Support**: Arabic (`ar`) requires Right-to-Left (RTL) layout. Use standard CSS logical properties (`margin-inline-start` instead of `margin-left`) or Tailwind's `rtl:` prefix where necessary.

---

## 5. Gotchas

- **Hard-coded Strings**: Never include user-facing strings directly in JSX. Add a key to `en.json` first.
- **Missing Keys**: If a key is missing in `fr.json`, the system should fallback to `en.json`.
- **Enum Translations**: For database enums (like `compliance_status`), create a dedicated namespace in the translation files to handle mapping database values to localized labels.
