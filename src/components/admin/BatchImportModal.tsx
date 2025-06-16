'use client';

import { useState } from 'react';
import { XMarkIcon, DocumentArrowDownIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface BatchImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BatchImportModal({ isOpen, onClose, onSuccess }: BatchImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // 验证文件类型
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'text/csv' // .csv
      ];
      
      if (!allowedTypes.includes(selectedFile.type)) {
        alert('请选择 Excel (.xlsx, .xls) 或 CSV 文件');
        return;
      }
      
      setFile(selectedFile);
      setImportResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert('请先选择文件');
      return;
    }

    setUploading(true);

    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://cprice-api.itsupport-5c8.workers.dev';
      
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${apiUrl}/api/users/batch-import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setImportResult(result.data);
        
        if (result.data.failed === 0) {
          setTimeout(() => {
            onSuccess();
          }, 2000);
        }
      } else {
        const errorData = await response.json();
        alert(errorData.error || '导入失败');
      }
    } catch (error) {
      console.error('Import failed:', error);
      alert('导入失败，请检查网络连接');
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    // 创建模板数据
    const templateData = [
      ['用户名', '邮箱', '密码', '角色', '状态', '权限ID(用逗号分隔)'],
      ['user1', 'user1@example.com', 'password123', 'user', 'true', 'perm_001,perm_002'],
      ['user2', 'user2@example.com', 'password123', 'admin', 'true', 'perm_001,perm_002,perm_003'],
    ];

    // 转换为CSV格式
    const csvContent = templateData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    // 创建下载链接
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'user_import_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                批量导入用户
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
              {/* 下载模板 */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <DocumentArrowDownIcon className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="ml-3 flex-1">
                    <h4 className="text-sm font-medium text-blue-800">
                      第一步：下载导入模板
                    </h4>
                    <p className="mt-1 text-sm text-blue-700">
                      请先下载模板文件，按照格式填写用户信息
                    </p>
                    <button
                      onClick={downloadTemplate}
                      className="mt-2 text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                    >
                      下载模板
                    </button>
                  </div>
                </div>
              </div>

              {/* 文件上传 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  第二步：选择文件
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div className="flex text-sm text-gray-600">
                      <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                        <span>选择文件</span>
                        <input
                          type="file"
                          className="sr-only"
                          accept=".xlsx,.xls,.csv"
                          onChange={handleFileChange}
                        />
                      </label>
                      <p className="pl-1">或拖拽文件到此处</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      支持 Excel (.xlsx, .xls) 和 CSV 文件
                    </p>
                  </div>
                </div>
                {file && (
                  <p className="mt-2 text-sm text-gray-600">
                    已选择文件: {file.name}
                  </p>
                )}
              </div>

              {/* 导入说明 */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-yellow-800">
                      导入说明
                    </h4>
                    <div className="mt-1 text-sm text-yellow-700">
                      <ul className="list-disc list-inside space-y-1">
                        <li>用户名和邮箱必须唯一</li>
                        <li>密码长度至少6个字符</li>
                        <li>角色只能是 "admin" 或 "user"</li>
                        <li>状态填写 "true" 或 "false"</li>
                        <li>权限ID可以通过权限管理页面查看</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* 导入结果 */}
              {importResult && (
                <div className={`border rounded-md p-4 ${
                  importResult.failed === 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}>
                  <h4 className={`text-sm font-medium ${
                    importResult.failed === 0 ? 'text-green-800' : 'text-red-800'
                  }`}>
                    导入结果
                  </h4>
                  <div className={`mt-1 text-sm ${
                    importResult.failed === 0 ? 'text-green-700' : 'text-red-700'
                  }`}>
                    <p>成功导入: {importResult.success} 个用户</p>
                    <p>导入失败: {importResult.failed} 个用户</p>
                    {importResult.errors && importResult.errors.length > 0 && (
                      <div className="mt-2">
                        <p className="font-medium">错误详情:</p>
                        <ul className="list-disc list-inside">
                          {importResult.errors.map((error: string, index: number) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
            >
              {uploading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  导入中...
                </div>
              ) : (
                '开始导入'
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
