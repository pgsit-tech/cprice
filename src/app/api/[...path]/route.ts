import { NextRequest, NextResponse } from 'next/server';

// Cloudflare Workers API的基础URL
const WORKERS_API_URL = process.env.WORKERS_API_URL || 'https://cprice-api.your-subdomain.workers.dev';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams.path, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams.path, 'POST');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams.path, 'PUT');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams.path, 'DELETE');
}

async function handleRequest(
  request: NextRequest,
  path: string[],
  method: string
) {
  try {
    // 构建目标URL
    const targetPath = path.join('/');
    const searchParams = request.nextUrl.searchParams.toString();
    const targetUrl = `${WORKERS_API_URL}/api/${targetPath}${searchParams ? `?${searchParams}` : ''}`;

    // 准备请求头
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // 转发Authorization头
    const authHeader = request.headers.get('Authorization');
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    // 准备请求体
    let body: string | undefined;
    if (method !== 'GET' && method !== 'DELETE') {
      try {
        const requestBody = await request.text();
        if (requestBody) {
          body = requestBody;
        }
      } catch (error) {
        // 忽略读取body的错误
      }
    }

    // 发送请求到Cloudflare Workers
    const response = await fetch(targetUrl, {
      method,
      headers,
      body,
    });

    // 获取响应数据
    const responseData = await response.text();
    
    // 返回响应
    return new NextResponse(responseData, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    console.error('API proxy error:', error);
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 处理OPTIONS请求（CORS预检）
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
