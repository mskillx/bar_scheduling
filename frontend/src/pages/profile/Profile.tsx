import { useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/authStore'
import type { ChangePasswordRequest } from '@/types/auth'

export default function ProfilePage() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<
    ChangePasswordRequest & { confirm_password: string }
  >()

  const onSubmit = async (data: ChangePasswordRequest & { confirm_password: string }) => {
    if (data.new_password !== data.confirm_password) {
      toast.error('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await authApi.changePassword({
        current_password: data.current_password,
        new_password: data.new_password,
      })
      toast.success('Password changed successfully')
      reset()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-xl font-semibold text-white">Profile</h1>

      <div className="card">
        <h2 className="font-medium text-white mb-4">Personal Information</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">First Name</span>
            <p className="text-white mt-0.5">{user?.first_name}</p>
          </div>
          <div>
            <span className="text-gray-400">Last Name</span>
            <p className="text-white mt-0.5">{user?.last_name}</p>
          </div>
          <div>
            <span className="text-gray-400">Email</span>
            <p className="text-white mt-0.5">{user?.email}</p>
          </div>
          <div>
            <span className="text-gray-400">Role</span>
            <p className="text-white mt-0.5 capitalize">{user?.role}</p>
          </div>
          {user?.hire_date && (
            <div>
              <span className="text-gray-400">Hire Date</span>
              <p className="text-white mt-0.5">{user.hire_date}</p>
            </div>
          )}
          {user?.hourly_rate != null && (
            <div>
              <span className="text-gray-400">Hourly Rate</span>
              <p className="text-white mt-0.5">€{user.hourly_rate}/h</p>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="font-medium text-white mb-4">Change Password</h2>
        {user?.must_change_password && (
          <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm text-yellow-300">
            ⚠️ You're using a default password. Please change it now.
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Current Password</label>
            <input
              type="password"
              className="input"
              {...register('current_password', { required: 'Required' })}
            />
            {errors.current_password && (
              <p className="text-xs text-red-400 mt-1">{errors.current_password.message}</p>
            )}
          </div>
          <div>
            <label className="label">New Password</label>
            <input
              type="password"
              className="input"
              {...register('new_password', { required: 'Required', minLength: { value: 8, message: 'Min 8 chars' } })}
            />
            {errors.new_password && (
              <p className="text-xs text-red-400 mt-1">{errors.new_password.message}</p>
            )}
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input
              type="password"
              className="input"
              {...register('confirm_password', { required: 'Required' })}
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Saving…' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
