'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  ChartBarIcon,
  DocumentTextIcon,
  UserGroupIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/admin/login');
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://cprice-api.itsupport-5c8.workers.dev';
      const response = await fetch(`${apiUrl}/api/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDashboardData(data.data);
      } else if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/admin/login');
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimInquiry = async (inquiryId: string) => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://cprice-api.itsupport-5c8.workers.dev';
      const response = await fetch(`${apiUrl}/api/dashboard/claim-inquiry/${inquiryId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchDashboardData(); // 刷新数据
      } else {
        const data = await response.json();
        alert(data.error || '抢单失败');
      }
    } catch (error) {
      console.error('Failed to claim inquiry:', error);
      alert('抢单失败，请重试');
    }
  };

  const handleUpdateInquiryStatus = async (inquiryId: string, status: string) => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://cprice-api.itsupport-5c8.workers.dev';
      const response = await fetch(`${apiUrl}/api/dashboard/inquiry/${inquiryId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        fetchDashboardData(); // 刷新数据
      } else {
        const data = await response.json();
        alert(data.error || '更新状态失败');
      }
    } catch (error) {
      console.error('Failed to update inquiry status:', error);
      alert('更新状态失败，请重试');
    }
  };

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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">仪表板</h1>
          <p className="text-gray-600">欢迎回到 CPrice 管理后台</p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ChartBarIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">总价格数</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardData?.stats?.totalPrices || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <DocumentTextIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">总咨询数</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardData?.stats?.totalInquiries || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <ClockIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">待处理咨询</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardData?.stats?.pendingInquiries || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <UserGroupIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">我的咨询</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardData?.stats?.myInquiries || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 最新公告 */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">最新公告</h2>
          </div>
          <div className="p-6">
            {dashboardData?.announcements?.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.announcements.map((announcement: any) => (
                  <div key={announcement.id} className="border-l-4 border-blue-500 pl-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900">{announcement.title}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        announcement.priority === 'high' ? 'bg-red-100 text-red-800' :
                        announcement.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {announcement.priority === 'high' ? '高' :
                         announcement.priority === 'medium' ? '中' : '低'}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mt-1">{announcement.content}</p>
                    <p className="text-gray-400 text-xs mt-2">
                      {announcement.created_by_name} · {new Date(announcement.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">暂无公告</p>
            )}
          </div>
        </div>

        {/* 待抢单咨询 */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">待抢单咨询</h2>
          </div>
          <div className="p-6">
            {dashboardData?.pendingInquiries?.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.pendingInquiries.map((inquiry: any) => (
                  <div key={inquiry.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900">{inquiry.customer_name}</h3>
                      <button
                        onClick={() => handleClaimInquiry(inquiry.id)}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                      >
                        抢单
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">业务类型:</span> {inquiry.business_type}
                      </div>
                      <div>
                        <span className="font-medium">起始地:</span> {inquiry.origin}
                      </div>
                      <div>
                        <span className="font-medium">目的地:</span> {inquiry.destination}
                      </div>
                      <div>
                        <span className="font-medium">地区:</span> {inquiry.customer_region}
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      提交时间: {new Date(inquiry.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">暂无待抢单咨询</p>
            )}
          </div>
        </div>

        {/* 我的咨询 */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">我的咨询</h2>
          </div>
          <div className="p-6">
            {dashboardData?.myInquiries?.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.myInquiries.map((inquiry: any) => (
                  <div key={inquiry.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900">{inquiry.customer_name}</h3>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          inquiry.status === 'assigned' ? 'bg-yellow-100 text-yellow-800' :
                          inquiry.status === 'quoted' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {inquiry.status === 'assigned' ? '已分配' :
                           inquiry.status === 'quoted' ? '已报价' : '已完成'}
                        </span>
                        {inquiry.status === 'assigned' && (
                          <button
                            onClick={() => handleUpdateInquiryStatus(inquiry.id, 'quoted')}
                            className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                          >
                            标记已报价
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">联系电话:</span> {inquiry.customer_phone}
                      </div>
                      <div>
                        <span className="font-medium">邮箱:</span> {inquiry.customer_email}
                      </div>
                      <div>
                        <span className="font-medium">起始地:</span> {inquiry.origin}
                      </div>
                      <div>
                        <span className="font-medium">目的地:</span> {inquiry.destination}
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      抢单时间: {new Date(inquiry.assigned_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">暂无我的咨询</p>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
