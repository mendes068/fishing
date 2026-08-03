import { useTranslation } from 'react-i18next'

export default function Search() {
  const { t } = useTranslation('search')
  return (
    <div>
      <h1>{t('title')}</h1>
      <p className="text-muted-foreground">{t('title')}</p>
    </div>
  )
}
