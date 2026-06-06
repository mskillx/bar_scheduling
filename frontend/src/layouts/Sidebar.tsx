import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/authStore'
import { classNames } from '@/utils/helpers'

export default function Sidebar() {
  const { t } = useTranslation()
  const { user } = useAuthStore()

  const employeeLinks = [
    { to: '/schedule', label: t('nav.schedule'), icon: '📅' },
    { to: '/dashboard', label: t('nav.dashboard'), icon: '🏠' },
    { to: '/profile', label: t('nav.profile'), icon: '👤' },
  ]

  const adminLinks = [
    { to: '/schedule', label: t('nav.schedule'), icon: '📅' },
    { to: '/admin/users', label: t('nav.users'), icon: '👥' },
    { to: '/admin/shifts', label: t('nav.shiftManagement'), icon: '🔧' },
    { to: '/admin/reports', label: t('nav.reports'), icon: '📊' },
    { to: '/profile', label: t('nav.profile'), icon: '👤' },
  ]

  const links = user?.role === 'admin' ? adminLinks : employeeLinks

  return (
    <aside className="w-64 bg-dark-800 border-r border-dark-600 flex flex-col">
      <div className="px-6 py-5 border-b border-dark-600">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            S
          </div>
          <span className="font-semibold text-white text-sm">{t('app.brand')}</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              classNames(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-600/20 text-brand-300'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-dark-700'
              )
            }
          >
            <span className="text-base">{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-dark-600">
        <div className="text-xs text-gray-500">
          <div className="font-medium text-gray-400">
            {user?.first_name} {user?.last_name}
          </div>
          <div className="capitalize mt-0.5">{user?.role}</div>
        </div>
      </div>
    </aside>
  )
}
