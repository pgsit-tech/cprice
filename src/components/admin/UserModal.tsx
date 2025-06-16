'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { XMarkIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const userSchema = z.object({
  username: z.string().min(1, '请输入用户名').min(3, '用户名至少3个字符'),
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(6, '密码至少6个字符').optional(),
  role: z.enum(['admin', 'user']),
  isActive: z.boolean(),
  permissions: z.array(z.string()),
});

type UserFormData = z.infer<typeof userSchema>;

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  permissions?: Permission[];
}

interface Permission {
  id: string;
  module: string;
  action: string;
  description: string;
}

interface UserModalProps {
  user: User | null;
  permissions: Permission[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UserModal({ user, permissions, isOpen, onClose, onSuccess }: UserModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const isEdit = !!user;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema.extend({
      password: isEdit 
        ? z.string().optional() 
        : z.string().min(6, '密码至少6个字符')
    }))
  });

  useEffect(() => {
    if (user) {
      setValue('username', user.username);
      setValue('email', user.email);
      setValue('role', user.role as 'admin' | 'user');
      setValue('isActive', user.is_active);
      
      const userPermissionIds = user.permissions?.map(p => p.id) || [];
      setSelectedPermissions(userPermissionIds);
      setValue('permissions', userPermissionIds);
    } else {
      reset();
      setSelectedPermissions([]);
    }
  }, [user, setValue, reset]);

  const onSubmit = async (data: UserFormData) => {
    setSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://cprice-api.itsupport-5c8.workers.dev';
      
      const requestData = {
        username: data.username,
        email: data.email,
        role: data.role,
        isActive: data.isActive,
        permissions: selectedPermissions,
        ...(data.password && { password: data.password })
      };

      const url = isEdit ? `${apiUrl}/api/users/${user.id}` : `${apiUrl}/api/users`;
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const errorData = await response.json();
        alert(errorData.error || `${isEdit ? '更新' : '创建'}用户失败`);
      }
    } catch (error) {
      console.error('Submit failed:', error);
      alert(`${isEdit ? '更新' : '创建'}用户失败，请检查网络连接`);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    const newPermissions = checked
      ? [...selectedPermissions, permissionId]
      : selectedPermissions.filter(id => id !== permissionId);
    
    setSelectedPermissions(newPermissions);
    setValue('permissions', newPermissions);
  };

  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.module]) {
      acc[permission.module] = [];
    }
    acc[permission.module].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  const moduleNames: Record<string, string> = {
    dashboard: '仪表板',
    prices: '价格管理',
    inquiries: '咨询管理',
    announcements: '公告管理',
    business_types: '业务类型',
    users: '用户管理'
  };

  const actionNames: Record<string, string> = {
    view: '查看',
    create: '创建',
    update: '更新',
    delete: '删除',
    export: '导出'
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {isEdit ? '编辑用户' : '创建用户'}
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* 基本信息 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      用户名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      {...register('username')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="请输入用户名"
                    />
                    {errors.username && (
                      <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      邮箱 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      {...register('email')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="请输入邮箱地址"
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                    )}
                  </div>
                </div>

                {/* 密码 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    密码 {!isEdit && <span className="text-red-500">*</span>}
                    {isEdit && <span className="text-gray-500">(留空则不修改)</span>}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      {...register('password')}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={isEdit ? "留空则不修改密码" : "请输入密码"}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                      ) : (
                        <EyeIcon className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                  )}
                </div>

                {/* 角色和状态 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      角色 <span className="text-red-500">*</span>
                    </label>
                    <select
                      {...register('role')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="user">普通用户</option>
                      <option value="admin">管理员</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">状态</label>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        {...register('isActive')}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 text-sm text-gray-700">账户激活</label>
                    </div>
                  </div>
                </div>

                {/* 权限设置 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">权限设置</label>
                  <div className="border border-gray-200 rounded-md p-4 max-h-60 overflow-y-auto">
                    {Object.entries(groupedPermissions).map(([module, modulePermissions]) => (
                      <div key={module} className="mb-4 last:mb-0">
                        <h4 className="font-medium text-gray-900 mb-2">
                          {moduleNames[module] || module}
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {modulePermissions.map((permission) => (
                            <label key={permission.id} className="flex items-center">
                              <input
                                type="checkbox"
                                checked={selectedPermissions.includes(permission.id)}
                                onChange={(e) => handlePermissionChange(permission.id, e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <span className="ml-2 text-sm text-gray-700">
                                {actionNames[permission.action] || permission.action}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
              >
                {submitting ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {isEdit ? '更新中...' : '创建中...'}
                  </div>
                ) : (
                  isEdit ? '更新用户' : '创建用户'
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
