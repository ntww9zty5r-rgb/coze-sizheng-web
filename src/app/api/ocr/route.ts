import { NextRequest, NextResponse } from 'next/server';

// 百度OCR配置
const BAIDU_OCR_API_KEY = process.env.BAIDU_OCR_API_KEY || 'N2dBpKhpPll6yrukJqtrJoTY';
const BAIDU_OCR_SECRET_KEY = process.env.BAIDU_OCR_SECRET_KEY || '2h5fRMeoEo3aTrojsLuuPSgO3oTW0cxt';

/**
 * 获取百度OCR Access Token
 */
async function getAccessToken(): Promise<string> {
  const tokenUrl = 'https://aip.baidubce.com/oauth/2.0/token';
  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: BAIDU_OCR_API_KEY,
    client_secret: BAIDU_OCR_SECRET_KEY,
  });

  const response = await fetch(`${tokenUrl}?${params.toString()}`, {
    method: 'POST',
  });

  const data = await response.json();

  if (data.access_token) {
    return data.access_token;
  } else {
    throw new Error(`Failed to get access token: ${JSON.stringify(data)}`);
  }
}

/**
 * 调用百度OCR识别图片文字
 */
async function recognizeText(imageBase64: string, accessToken: string): Promise<string> {
  const ocrUrl = 'https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic';
  
  const params = new URLSearchParams({
    access_token: accessToken,
  });

  const response = await fetch(`${ocrUrl}?${params.toString()}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      image: imageBase64,
    }).toString(),
  });

  const data = await response.json();

  if (data.words_result) {
    // 合并所有识别结果
    const words = data.words_result.map((item: { words: string }) => item.words).join('\n');
    return words;
  } else if (data.error_code) {
    throw new Error(`OCR error: ${data.error_msg || 'Unknown error'}`);
  } else {
    throw new Error('No text recognized');
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;

    if (!imageFile) {
      return NextResponse.json(
        { error: '未上传图片' },
        { status: 400 }
      );
    }

    // 将图片转换为 base64
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const imageBase64 = buffer.toString('base64');

    // 获取 access token
    const accessToken = await getAccessToken();

    // 调用 OCR 识别
    const recognizedText = await recognizeText(imageBase64, accessToken);

    return NextResponse.json({
      success: true,
      text: recognizedText,
    });

  } catch (error) {
    console.error('OCR error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'OCR识别失败',
        success: false,
      },
      { status: 500 }
    );
  }
}
