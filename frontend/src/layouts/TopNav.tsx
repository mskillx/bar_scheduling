import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'

export default function TopNav() {
  const { t } = useTranslation()
  const { user, logout } = useAuth()

  return (
    <header className="h-14 bg-dark-800 border-b border-dark-600 flex items-center justify-between px-6">
      <div className="text-sm text-gray-400">
        {user?.must_change_password && (
          <span className="text-yellow-400 font-medium">
            {t('topNav.changePasswordWarning')}
          </span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-400">
          {user?.first_name} {user?.last_name}
        </span>
        <button
          onClick={logout}
          className="text-sm text-gray-400 hover:text-red-400 transition-colors"
        >
          {t('auth.signOut')}
        </button>
      </div>
    </header>
  )
}
