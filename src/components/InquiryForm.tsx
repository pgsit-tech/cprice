'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const inquirySchema = z.object({
  customerName: z.string().min(1, '请输入姓名'),
  customerEmail: z.string().email('请输入有效的邮箱地址'),
  customerPhone: z.string().min(1, '请输入联系电话'),
  customerRegion: z.string().min(1, '请选择所在地区'),
  businessType: z.string().min(1, '请选择业务类型'),
  origin: z.string().min(1, '请输入起始地'),
  destination: z.string().min(1, '请输入目的地'),
  cargoDescription: z.string().optional(),
  estimatedWeight: z.number().optional(),
  estimatedVolume: z.number().optional(),
  expectedShipDate: z.string().optional(),
  additionalRequirements: z.string().optional(),
});

type InquiryFormData = z.infer<typeof inquirySchema>;

interface InquiryFormProps {
  businessTypes: any[];
}

const regions = [
  '北京', '上海', '广州', '深圳', '杭州', '南京', '苏州', '天津',
  '重庆', '成都', '武汉', '西安', '青岛', '大连', '厦门', '宁波',
  '其他'
];

export default function InquiryForm({ businessTypes }: InquiryFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<InquiryFormData>({
    resolver: zodResolver(inquirySchema)
  });

  const onSubmit = async (data: InquiryFormData) => {
    setSubmitting(true);

    try {
      const response = await fetch('/api/public/inquiries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setSubmitted(true);
        reset();
      } else {
        const errorData = await response.json();
        alert(errorData.error || '提交失败，请重试');
      }
    } catch (error) {
      console.error('Submit failed:', error);
      alert('提交失败，请检查网络连接');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-8">
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-4">
          <h3 className="font-semibold mb-2">提交成功！</h3>
          <p>我们已收到您的咨询，专业团队将在24小时内与您联系。</p>
        </div>
        <button
          onClick={() => setSubmitted(false)}
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          提交新的咨询
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* 基本信息 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            姓名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            {...register('customerName')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="请输入您的姓名"
          />
          {errors.customerName && (
            <p className="mt-1 text-sm text-red-600">{errors.customerName.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            邮箱 <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            {...register('customerEmail')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="请输入邮箱地址"
          />
          {errors.customerEmail && (
            <p className="mt-1 text-sm text-red-600">{errors.customerEmail.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            联系电话 <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            {...register('customerPhone')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="请输入联系电话"
          />
          {errors.customerPhone && (
            <p className="mt-1 text-sm text-red-600">{errors.customerPhone.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            所在地区 <span className="text-red-500">*</span>
          </label>
          <select
            {...register('customerRegion')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">请选择所在地区</option>
            {regions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
          {errors.customerRegion && (
            <p className="mt-1 text-sm text-red-600">{errors.customerRegion.message}</p>
          )}
        </div>
      </div>

      {/* 物流信息 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            业务类型 <span className="text-red-500">*</span>
          </label>
          <select
            {...register('businessType')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">请选择业务类型</option>
            {businessTypes.map((type) => (
              <option key={type.id} value={type.code}>
                {type.name}
              </option>
            ))}
          </select>
          {errors.businessType && (
            <p className="mt-1 text-sm text-red-600">{errors.businessType.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            起始地 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            {...register('origin')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="请输入起始地"
          />
          {errors.origin && (
            <p className="mt-1 text-sm text-red-600">{errors.origin.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            目的地 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            {...register('destination')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="请输入目的地"
          />
          {errors.destination && (
            <p className="mt-1 text-sm text-red-600">{errors.destination.message}</p>
          )}
        </div>
      </div>

      {/* 货物信息 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            预估重量 (kg)
          </label>
          <input
            type="number"
            step="0.1"
            {...register('estimatedWeight', { valueAsNumber: true })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="请输入预估重量"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            预估体积 (m³)
          </label>
          <input
            type="number"
            step="0.1"
            {...register('estimatedVolume', { valueAsNumber: true })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="请输入预估体积"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            预期发货日期
          </label>
          <input
            type="date"
            {...register('expectedShipDate')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* 货物描述和附加要求 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            货物描述
          </label>
          <textarea
            {...register('cargoDescription')}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="请描述您的货物类型、特性等"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            附加要求
          </label>
          <textarea
            {...register('additionalRequirements')}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="请输入特殊要求或备注信息"
          />
        </div>
      </div>

      {/* 提交按钮 */}
      <div className="text-center">
        <button
          type="submit"
          disabled={submitting}
          className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              提交中...
            </div>
          ) : (
            '提交咨询'
          )}
        </button>
      </div>
    </form>
  );
}
