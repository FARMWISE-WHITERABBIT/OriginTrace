---
name: i18n
description: >
  Use this skill when adding new translatable strings, creating a new locale,
  building locale-aware components, or working with next-intl. Triggers for
  any mention of "translation", "i18n", "internationalisation", "add a locale",
  "French translation", "Arabic translation", "messages folder", "next-intl",
  "useTranslations", "locale-aware", "language switcher", or "RTL". Always use
  this skill before adding any user-facing text to avoid hardcoded strings
  that can't be translated.
---

# i18n Skill

## 1. Overview

OriginTrace is used by field agents and buyers across Africa and the Middle East.
We support three primary locales: English (`en`), French (`fr`), and Arabic (`ar`).

---

## 2. Translation Files (`messages/`)

| File | Purpose |
|------|---------|
| `en.json` | Source of truth for all keys (~10KB) |
| `fr.json` | French (West African regions) |
| `ar.json` | Arabic (North African / Middle Eastern markets) |

---

## 3. Common Patterns

OriginTrace uses `next-intl` for translatable strings.

**Client Components:**
```typescript
const t = useTranslations('Farms');
return <h1>{t('title')}</h1>;
```

**Server Components:**
```typescript
const t = await getTranslations('Farms');
```

**Locale Switcher:** `components/locale-switcher.tsx`

---

## 4. Best Practices

- **Key Naming**: PascalCase for namespaces, camelCase for keys (e.g., `Farms.addFarmButton`).
- **Interpolation**: `t('welcome', { name: 'Adebayo' })` with curly braces for variables.
- **RTL Support**: Arabic (`ar`) requires Right-to-Left layout. Use CSS logical properties (`margin-inline-start` instead of `margin-left`) or Tailwind's `rtl:` prefix.
- **Plurals**: Use ICU syntax for plural forms: `{count, plural, one {# item} other {# items}}`.

---

## 5. Adding a New Translatable String

1. Add the key to `messages/en.json` first (source of truth)
2. Add corresponding translations to `fr.json` and `ar.json`
3. Use `useTranslations('Namespace')` in the component
4. Never hardcode user-facing strings directly in JSX

---

## 6. Gotchas

- **Hard-coded Strings**: Never include user-facing strings directly in JSX. Add a key to `en.json` first.
- **Missing Keys**: If a key is missing in `fr.json`, the system falls back to `en.json`.
- **Enum Translations**: For database enums (like `compliance_status`), create a dedicated namespace to map database values to localized labels.
- **Number Formatting**: Use `useFormatter()` from next-intl for locale-aware number/date formatting.
