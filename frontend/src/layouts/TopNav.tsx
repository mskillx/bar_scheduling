import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";

interface TopNavProps {
  onMenuClick: () => void;
}

export default function TopNav({ onMenuClick }: TopNavProps) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  return (
    <header className="h-14 bg-dark-800 border-b border-dark-600 flex items-center justify-between px-6">
      <div className="flex items-center gap-3 text-sm text-gray-400">
        <button
          onClick={onMenuClick}
          className="md:hidden text-gray-400 hover:text-white transition-colors"
          aria-label="Toggle menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
        {user?.must_change_password && (
          <span className="text-yellow-400 font-medium">{t("topNav.changePasswordWarning")}</span>
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
          {t("auth.signOut")}
        </button>
      </div>
    </header>
  );
}
