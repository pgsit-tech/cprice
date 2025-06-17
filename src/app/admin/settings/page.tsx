'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { 
  CogIcon, 
  PhotoIcon,
  CheckIcon,
  XMarkIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface SystemSettings {
  system_name: { value: string; type: string; description: string };
  system_subtitle: { value: string; type: string; description: string };
  system_logo: { value: string; type: string; description: string };
  footer_text: { value: string; type: string; description: string };
  contact_email: { value: string; type: string; description: string };
  contact_phone: { value: string; type: string; description: string };
  company_address: { value: string; type: string; description: string };
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 获取系统设置
  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/settings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSettings(data.data);
        } else {
          setMessage({ type: 'error', text: data.error || '获取设置失败' });
        }
      } else {
        setMessage({ type: 'error', text: '获取设置失败' });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      setMessage({ type: 'error', text: '网络错误' });
    } finally {
      setLoading(false);
    }
  };

  // 保存系统设置
  const saveSettings = async () => {
    if (!settings) return;

    setSaving(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('token');
      const settingsToSave: any = {};
      
      // 转换设置格式
      Object.entries(settings).forEach(([key, setting]) => {
        settingsToSave[key] = setting.value;
      });

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settingsToSave),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setMessage({ type: 'success', text: '设置保存成功' });
        } else {
          setMessage({ type: 'error', text: data.error || '保存失败' });
        }
      } else {
        setMessage({ type: 'error', text: '保存失败' });
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: '网络错误' });
    } finally {
      setSaving(false);
    }
  };

  // 重置为默认设置
  const resetSettings = async () => {
    if (!confirm('确定要重置为默认设置吗？此操作不可撤销。')) {
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/settings/reset`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setMessage({ type: 'success', text: '设置已重置为默认值' });
          fetchSettings(); // 重新获取设置
        } else {
          setMessage({ type: 'error', text: data.error || '重置失败' });
        }
      } else {
        setMessage({ type: 'error', text: '重置失败' });
      }
    } catch (error) {
      console.error('Error resetting settings:', error);
      setMessage({ type: 'error', text: '网络错误' });
    } finally {
      setSaving(false);
    }
  };

  // 更新设置值
  const updateSetting = (key: string, value: string) => {
    if (!settings) return;
    
    setSettings({
      ...settings,
      [key]: {
        ...settings[key as keyof SystemSettings],
        value
      }
    });
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CogIcon className="h-8 w-8 text-gray-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">系统设置</h1>
              <p className="text-gray-600">配置系统基本信息和显示设置</p>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={resetSettings}
              disabled={saving}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <ArrowPathIcon className="h-4 w-4 mr-2" />
              重置默认
            </button>
            
            <button
              onClick={saveSettings}
              disabled={saving}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {saving ? (
                <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckIcon className="h-4 w-4 mr-2" />
              )}
              {saving ? '保存中...' : '保存设置'}
            </button>
          </div>
        </div>

        {/* 消息提示 */}
        {message && (
          <div className={`rounded-md p-4 ${
            message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex">
              <div className="flex-shrink-0">
                {message.type === 'success' ? (
                  <CheckIcon className="h-5 w-5 text-green-400" />
                ) : (
                  <XMarkIcon className="h-5 w-5 text-red-400" />
                )}
              </div>
              <div className="ml-3">
                <p className={`text-sm font-medium ${
                  message.type === 'success' ? 'text-green-800' : 'text-red-800'
                }`}>
                  {message.text}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 设置表单 */}
        {settings && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">基本设置</h2>
            </div>
            
            <div className="px-6 py-4 space-y-6">
              {/* 系统名称 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  系统名称
                </label>
                <input
                  type="text"
                  value={settings.system_name?.value || ''}
                  onChange={(e) => updateSetting('system_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请输入系统名称"
                />
                <p className="mt-1 text-sm text-gray-500">{settings.system_name?.description}</p>
              </div>

              {/* 系统副标题 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  系统副标题
                </label>
                <input
                  type="text"
                  value={settings.system_subtitle?.value || ''}
                  onChange={(e) => updateSetting('system_subtitle', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请输入系统副标题"
                />
                <p className="mt-1 text-sm text-gray-500">{settings.system_subtitle?.description}</p>
              </div>

              {/* 系统图标 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  系统图标URL
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="url"
                    value={settings.system_logo?.value || ''}
                    onChange={(e) => updateSetting('system_logo', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="请输入图标URL"
                  />
                  {settings.system_logo?.value && (
                    <div className="flex-shrink-0">
                      <img
                        src={settings.system_logo.value}
                        alt="系统图标预览"
                        className="h-10 w-10 rounded-lg object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
                <p className="mt-1 text-sm text-gray-500">{settings.system_logo?.description}</p>
              </div>

              {/* 页脚文本 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  页脚文本
                </label>
                <textarea
                  value={settings.footer_text?.value || ''}
                  onChange={(e) => updateSetting('footer_text', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请输入页脚文本"
                />
                <p className="mt-1 text-sm text-gray-500">{settings.footer_text?.description}</p>
              </div>

              {/* 联系信息 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    联系邮箱
                  </label>
                  <input
                    type="email"
                    value={settings.contact_email?.value || ''}
                    onChange={(e) => updateSetting('contact_email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="请输入联系邮箱"
                  />
                  <p className="mt-1 text-sm text-gray-500">{settings.contact_email?.description}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    联系电话
                  </label>
                  <input
                    type="tel"
                    value={settings.contact_phone?.value || ''}
                    onChange={(e) => updateSetting('contact_phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="请输入联系电话"
                  />
                  <p className="mt-1 text-sm text-gray-500">{settings.contact_phone?.description}</p>
                </div>
              </div>

              {/* 公司地址 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  公司地址
                </label>
                <input
                  type="text"
                  value={settings.company_address?.value || ''}
                  onChange={(e) => updateSetting('company_address', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请输入公司地址"
                />
                <p className="mt-1 text-sm text-gray-500">{settings.company_address?.description}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
