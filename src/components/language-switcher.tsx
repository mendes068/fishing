import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const LANGUAGES = [
  { code: 'de', label: 'DE' },
  { code: 'en', label: 'EN' },
  { code: 'pt-BR', label: 'PT-BR' },
] as const

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation()

  const currentLabel =
    LANGUAGES.find((l) => l.code === i18n.language)?.label ??
    i18n.language.toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            data-testid="language-switcher"
            aria-label={t('lang.label')}
          />
        }
      >
        <span className="text-xs font-medium">{currentLabel}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={i18n.language}
          onValueChange={(lang) => {
            void i18n.changeLanguage(lang)
          }}
        >
          {LANGUAGES.map(({ code, label }) => (
            <DropdownMenuRadioItem key={code} value={code}>
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
