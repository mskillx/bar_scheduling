import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { usersApi } from "@/api/users";
import type { User, UserCreate, UserUpdate } from "@/types/user";
import Modal from "@/components/common/Modal";
import LoadingSkeleton from "@/components/common/LoadingSkeleton";

function UserFormModal({
  open,
  onClose,
  editUser,
}: {
  open: boolean;
  onClose: () => void;
  editUser?: User | null;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const isEdit = !!editUser;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UserCreate>({
    defaultValues: editUser
      ? {
          first_name: editUser.first_name,
          last_name: editUser.last_name,
          email: editUser.email,
          role: editUser.role,
          hourly_rate: editUser.hourly_rate ?? 0,
        }
      : { role: "employee", hourly_rate: 0 },
  });

  const createMutation = useMutation({
    mutationFn: (data: UserCreate) => usersApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success(t("user.created"));
      onClose();
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || t("user.failed")),
  });

  const updateMutation = useMutation({
    mutationFn: (data: UserUpdate) => usersApi.update(editUser!.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success(t("user.updated"));
      onClose();
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || t("user.failed")),
  });

  const onSubmit = (data: UserCreate) => {
    if (isEdit) {
      const { password, ...rest } = data;
      updateMutation.mutate(rest);
    } else {
      createMutation.mutate(data);
    }
  };

  const loading = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? t("user.editUser") : t("user.createUser")}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">{t("user.firstName")}</label>
            <input className="input" {...register("first_name", { required: true })} />
          </div>
          <div>
            <label className="label">{t("user.lastName")}</label>
            <input className="input" {...register("last_name", { required: true })} />
          </div>
        </div>
        <div>
          <label className="label">{t("user.email")}</label>
          <input type="email" className="input" {...register("email", { required: true })} />
        </div>
        {!isEdit && (
          <div>
            <label className="label">{t("user.password")}</label>
            <input
              type="password"
              className="input"
              {...register("password", { required: true, minLength: 8 })}
            />
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">{t("user.role")}</label>
            <select className="input" {...register("role")}>
              <option value="employee">{t("user.employee")}</option>
              <option value="admin">{t("user.admin")}</option>
            </select>
          </div>
          <div>
            <label className="label">{t("user.hourlyRate")}</label>
            <input
              type="number"
              step="0.01"
              className="input"
              {...register("hourly_rate", { valueAsNumber: true })}
            />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary flex-1" disabled={loading}>
            {loading ? t("user.saving") : isEdit ? t("user.update") : t("user.create")}
          </button>
          <button type="button" className="btn-secondary" onClick={onClose}>
            {t("user.cancel")}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function UsersPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: usersApi.list,
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [search, setSearch] = useState("");

  const disableMutation = useMutation({
    mutationFn: (id: number) => usersApi.disable(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success(t("user.disabledSuccess"));
    },
  });

  const filtered = users.filter((u) =>
    `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">{t("nav.users")}</h1>
        <button
          className="btn-primary"
          onClick={() => {
            setEditUser(null);
            setModalOpen(true);
          }}
        >
          {t("user.addUser")}
        </button>
      </div>

      <div className="card p-4">
        <input
          className="input max-w-xs"
          placeholder={t("user.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            <LoadingSkeleton rows={4} />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-600">
                <th className="text-left px-6 py-3 text-gray-400 font-medium">{t("user.name")}</th>
                <th className="text-left px-6 py-3 text-gray-400 font-medium">{t("user.email")}</th>
                <th className="text-left px-6 py-3 text-gray-400 font-medium">{t("user.role")}</th>
                <th className="text-left px-6 py-3 text-gray-400 font-medium">{t("user.rate")}</th>
                <th className="text-left px-6 py-3 text-gray-400 font-medium">
                  {t("user.status")}
                </th>
                <th className="text-left px-6 py-3 text-gray-400 font-medium">
                  {t("user.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-dark-700/50 transition-colors">
                  <td className="px-6 py-3 text-white">
                    {u.first_name} {u.last_name}
                  </td>
                  <td className="px-6 py-3 text-gray-300">{u.email}</td>
                  <td className="px-6 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        u.role === "admin"
                          ? "bg-brand-600/20 text-brand-300"
                          : "bg-dark-600 text-gray-400"
                      }`}
                    >
                      {u.role === "admin" ? t("user.admin") : t("user.employee")}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-gray-300">
                    {u.hourly_rate != null ? `€${u.hourly_rate}/h` : "—"}
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        u.active ? "bg-green-600/20 text-green-400" : "bg-red-600/20 text-red-400"
                      }`}
                    >
                      {u.active ? t("user.active") : t("user.disabled")}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex gap-2">
                      <button
                        className="text-xs text-brand-400 hover:text-brand-300"
                        onClick={() => {
                          setEditUser(u);
                          setModalOpen(true);
                        }}
                      >
                        {t("user.edit")}
                      </button>
                      {u.active && (
                        <button
                          className="text-xs text-red-400 hover:text-red-300"
                          onClick={() => {
                            if (
                              confirm(
                                t("user.disableConfirm", {
                                  name: u.first_name,
                                }),
                              )
                            )
                              disableMutation.mutate(u.id);
                          }}
                        >
                          {t("user.disable")}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <UserFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditUser(null);
        }}
        editUser={editUser}
      />
    </div>
  );
}
