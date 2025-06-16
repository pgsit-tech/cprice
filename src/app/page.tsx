'use client';

import { useState, useEffect } from 'react';
import { MagnifyingGlassIcon, TruckIcon, GlobeAsiaAustraliaIcon } from '@heroicons/react/24/outline';
import PriceSearch from '@/components/PriceSearch';
import InquiryForm from '@/components/InquiryForm';
import Hero from '@/components/Hero';

export default function Home() {
  const [businessTypes, setBusinessTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBusinessTypes();
  }, []);

  const fetchBusinessTypes = async () => {
    try {
      const response = await fetch('/api/public/business-types');
      if (response.ok) {
        const data = await response.json();
        setBusinessTypes(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch business types:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <Hero />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Services Overview */}
        <section className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              专业物流服务
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              提供海运、空运、FBA、卡派、卡航等全方位物流解决方案，为您的货物运输保驾护航
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {!loading && businessTypes.map((type: any) => (
              <div key={type.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center mb-4">
                  <div className="bg-blue-100 p-3 rounded-lg mr-4">
                    {type.code === 'SEA' && <GlobeAsiaAustraliaIcon className="h-6 w-6 text-blue-600" />}
                    {type.code === 'AIR' && <TruckIcon className="h-6 w-6 text-blue-600" />}
                    {['FBA', 'TRUCK', 'TRUCK_AIR'].includes(type.code) && <TruckIcon className="h-6 w-6 text-blue-600" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{type.name}</h3>
                    <p className="text-sm text-gray-500">{type.code}</p>
                  </div>
                </div>
                <p className="text-gray-600">{type.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Price Search Section */}
        <section className="mb-16">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center mb-4">
                <MagnifyingGlassIcon className="h-8 w-8 text-blue-600 mr-3" />
                <h2 className="text-2xl font-bold text-gray-900">价格查询</h2>
              </div>
              <p className="text-gray-600">
                快速查询各类物流服务的最新价格信息
              </p>
            </div>
            <PriceSearch businessTypes={businessTypes} />
          </div>
        </section>

        {/* Inquiry Form Section */}
        <section>
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                获取专属报价
              </h2>
              <p className="text-gray-600">
                填写您的需求信息，我们的专业团队将为您提供最优惠的报价方案
              </p>
            </div>
            <InquiryForm businessTypes={businessTypes} />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">CPrice 物流</h3>
              <p className="text-gray-400">
                专业的货运代理物流服务提供商，致力于为客户提供高效、可靠的物流解决方案。
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">服务范围</h3>
              <ul className="space-y-2 text-gray-400">
                <li>海运服务</li>
                <li>空运服务</li>
                <li>FBA头程</li>
                <li>卡车运输</li>
                <li>多式联运</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">联系我们</h3>
              <div className="space-y-2 text-gray-400">
                <p>邮箱: info@cprice.com</p>
                <p>电话: 400-123-4567</p>
                <p>地址: 中国上海市浦东新区</p>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 CPrice 物流. 保留所有权利.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
