'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Upload, Camera, Search, BookOpen, FileText, Loader2, ExternalLink, Calendar, Globe, Image as ImageIcon, Video, Link2, FileCheck, RefreshCw, Shuffle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

interface CaseItem {
  title: string;
  summary: string;
  source: string;
  publishTime: string;
  webUrl: string;
  imageUrl: string;
  videoUrl: string | null;
}

interface QueryResult {
  cases: CaseItem[];
  meta?: {
    total: number;
    keywords: string;
    validSources: string[];
    timeRange: string;
    tip: string;
    note: string;
  };
}

export default function HomePage() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [ocrResult, setOcrResult] = useState<string>('');
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [isQueryLoading, setIsQueryLoading] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState<Record<number, boolean>>({});
  const [refreshKey, setRefreshKey] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputCameraRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
        setImageFile(file);
        setOcrResult('');
        setQueryResult(null);
        setErrorMessage('');
        setRefreshKey(0);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleCameraClick = () => {
    fileInputCameraRef.current?.click();
  };

  const handleOcr = async () => {
    if (!imageFile) return;

    setIsOcrLoading(true);
    setOcrResult('');

    try {
      const formData = new FormData();
      formData.append('image', imageFile);

      const response = await fetch('/api/ocr', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (response.ok) {
        setOcrResult(data.text || '未识别到文字内容');
      } else {
        setOcrResult(`识别失败: ${data.error || '未知错误'}`);
      }
    } catch (error) {
      setOcrResult('OCR识别失败，请重试');
      console.error('OCR error:', error);
    } finally {
      setIsOcrLoading(false);
    }
  };

  const fetchCases = async (isRefresh: boolean = false) => {
    if (!ocrResult || ocrResult.startsWith('识别失败') || ocrResult.startsWith('OCR')) return;

    if (isRefresh) {
      setRefreshKey(prev => prev + 1);
    }

    setIsQueryLoading(true);
    setQueryResult(null);
    setErrorMessage('');

    try {
      const response = await fetch(`/api/query?refresh=${refreshKey + (isRefresh ? 1 : 0)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: ocrResult }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '查询失败');
      }

      setQueryResult(data);
      
      if (!data.cases || data.cases.length === 0) {
        setErrorMessage('未找到符合条件的案例，请尝试其他教材内容');
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '案例查询失败，请重试');
      console.error('Query error:', error);
    } finally {
      setIsQueryLoading(false);
    }
  };

  const handleQuery = () => fetchCases(false);
  const handleRefresh = () => fetchCases(true);

  const handleImageError = (index: number) => {
    setIsImageLoading(prev => ({ ...prev, [index]: false }));
  };

  const handleImageLoad = (index: number) => {
    setIsImageLoading(prev => ({ ...prev, [index]: false }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-cyan-50">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* 标题区域 */}
        <header className="text-center mb-8">
          <h1 
            className="text-4xl md:text-5xl font-bold mb-4"
            style={{ 
              fontFamily: 'Microsoft YaHei, sans-serif',
              color: '#023047'
            }}
          >
            思政教材案例智能查询
          </h1>
          <p className="text-lg" style={{ color: '#5D9BBD' }}>
            思政课专业案例助手 · 时政热点 · 链接生活
          </p>
          {/* 来源说明 */}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {['人民网', '新华网', '央视网', '浙江在线', '求是网'].map(source => (
              <Badge key={source} variant="outline" className="border-[#5D9BBD] text-[#5D9BBD] bg-[#5D9BBD]/5">
                {source}
              </Badge>
            ))}
          </div>
        </header>

        {/* 主要内容区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左侧：上传和识别区域 */}
          <div className="space-y-6">
            {/* 图片上传区 */}
            <Card className="border-2 border-dashed border-[#5D9BBD]/30 hover:border-[#5D9BBD] transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{ color: '#023047' }}>
                  <Upload className="w-5 h-5" style={{ color: '#5D9BBD' }} />
                  图片上传
                </CardTitle>
                <CardDescription>
                  支持拍照或上传图片，用于识别教材文字
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center gap-4">
                  {/* 隐藏的文件输入 */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/*"
                    className="hidden"
                  />
                  <input
                    type="file"
                    ref={fileInputCameraRef}
                    onChange={handleFileSelect}
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                  />

                  {/* 图片预览区域 */}
                  {selectedImage ? (
                    <div className="relative w-full">
                      <img
                        src={selectedImage}
                        alt="Selected"
                        className="w-full h-64 object-contain rounded-lg bg-gray-100"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          setSelectedImage(null);
                          setImageFile(null);
                          setOcrResult('');
                          setQueryResult(null);
                          setRefreshKey(0);
                        }}
                      >
                        清除
                      </Button>
                    </div>
                  ) : (
                    <div className="w-full h-64 rounded-lg bg-gradient-to-br from-[#5D9BBD]/10 to-[#023047]/5 flex flex-col items-center justify-center gap-4">
                      <div className="text-center">
                        <p className="text-gray-500 mb-4">点击下方按钮选择图片</p>
                        <div className="flex gap-3">
                          <Button
                            onClick={handleUploadClick}
                            className="bg-[#5D9BBD] hover:bg-[#023047] text-white"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            上传图片
                          </Button>
                          <Button
                            variant="outline"
                            onClick={handleCameraClick}
                            className="border-[#5D9BBD] text-[#5D9BBD] hover:bg-[#5D9BBD]/10"
                          >
                            <Camera className="w-4 h-4 mr-2" />
                            拍照
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 识别按钮 */}
                  {selectedImage && !ocrResult && (
                    <Button
                      onClick={handleOcr}
                      disabled={isOcrLoading}
                      className="w-full bg-[#5D9BBD] hover:bg-[#023047] text-white"
                    >
                      {isOcrLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          识别中...
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4 mr-2" />
                          识别文字
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* OCR结果区域 */}
            {ocrResult && (
              <Card className="border-[#5D9BBD]/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2" style={{ color: '#023047' }}>
                    <FileCheck className="w-5 h-5" style={{ color: '#5D9BBD' }} />
                    识别结果
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={ocrResult}
                    onChange={(e) => setOcrResult(e.target.value)}
                    className="min-h-[150px] bg-white"
                    placeholder="OCR识别结果将显示在这里..."
                  />
                  <div className="mt-4 flex gap-3">
                    <Button
                      variant="outline"
                      onClick={handleOcr}
                      disabled={isOcrLoading}
                      className="border-[#5D9BBD] text-[#5D9BBD]"
                    >
                      <RefreshCw className="w-4 h-4 mr-1" />
                      重新识别
                    </Button>
                    <Button
                      onClick={handleQuery}
                      disabled={isQueryLoading || !ocrResult}
                      className="flex-1 bg-[#5D9BBD] hover:bg-[#023047] text-white"
                    >
                      {isQueryLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          搜索中...
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4 mr-2" />
                          查询案例
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* 右侧：案例展示区域 */}
          <div>
            <Card className="border-[#5D9BBD]/30 h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{ color: '#023047' }}>
                  <BookOpen className="w-5 h-5" style={{ color: '#5D9BBD' }} />
                  案例展示
                </CardTitle>
                <CardDescription>
                  每个案例包含：网页链接、标题、简介、来源、时间、图片、视频
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* 结构化案例展示 */}
                {queryResult && queryResult.cases && queryResult.cases.length > 0 ? (
                  <div className="space-y-6">
                    {queryResult.cases.map((caseItem, index) => (
                      <div 
                        key={`${refreshKey}-${index}`}
                        className="border border-[#5D9BBD]/30 rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow"
                      >
                        {/* 标题 */}
                        <h3 className="text-lg font-bold mb-2" style={{ color: '#023047' }}>
                          {caseItem.title}
                        </h3>

                        {/* 图片 */}
                        {caseItem.imageUrl ? (
                          <div className="mb-3">
                            {isImageLoading[index] !== false && (
                              <div className="w-full h-48 flex items-center justify-center bg-gray-100 rounded-lg">
                                <Loader2 className="w-6 h-6 animate-spin text-[#5D9BBD]" />
                              </div>
                            )}
                            <img
                              src={caseItem.imageUrl}
                              alt={caseItem.title}
                              className="w-full h-48 object-cover rounded-lg"
                              style={{ display: isImageLoading[index] === false ? 'block' : 'none' }}
                              onLoad={() => handleImageLoad(index)}
                              onError={() => handleImageError(index)}
                            />
                          </div>
                        ) : (
                          <div className="mb-3 w-full h-48 bg-gradient-to-br from-[#5D9BBD]/10 to-[#023047]/5 rounded-lg flex items-center justify-center">
                            <ImageIcon className="w-12 h-12 text-gray-300" />
                          </div>
                        )}

                        {/* 简短内容 */}
                        <p className="text-gray-600 mb-3 leading-relaxed">
                          {caseItem.summary}
                        </p>

                        {/* 元信息标签 */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          {caseItem.source && (
                            <Badge variant="outline" className="flex items-center gap-1 border-[#5D9BBD] text-[#5D9BBD]">
                              <Globe className="w-3 h-3" />
                              {caseItem.source}
                            </Badge>
                          )}
                          {caseItem.publishTime && (
                            <Badge variant="outline" className="flex items-center gap-1 border-[#A8A8A8] text-gray-600">
                              <Calendar className="w-3 h-3" />
                              {caseItem.publishTime}
                            </Badge>
                          )}
                        </div>

                        {/* 链接按钮组 */}
                        <div className="flex flex-wrap gap-2">
                          {caseItem.webUrl && caseItem.webUrl.startsWith('http') && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-[#023047] text-[#023047] hover:bg-[#023047]/10"
                              onClick={() => window.open(caseItem.webUrl, '_blank')}
                            >
                              <Link2 className="w-4 h-4 mr-1" />
                              查看原文
                              <ExternalLink className="w-3 h-3 ml-1" />
                            </Button>
                          )}
                          {caseItem.imageUrl && caseItem.imageUrl.startsWith('http') && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-[#5D9BBD] text-[#5D9BBD] hover:bg-[#5D9BBD]/10"
                              onClick={() => window.open(caseItem.imageUrl, '_blank')}
                            >
                              <ImageIcon className="w-4 h-4 mr-1" />
                              查看图片
                              <ExternalLink className="w-3 h-3 ml-1" />
                            </Button>
                          )}
                          {caseItem.videoUrl && caseItem.videoUrl.startsWith('http') && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-[#023047] text-[#023047] hover:bg-[#023047]/10"
                              onClick={() => caseItem.videoUrl && window.open(caseItem.videoUrl, '_blank')}
                            >
                              <Video className="w-4 h-4 mr-1" />
                              观看视频
                              <ExternalLink className="w-3 h-3 ml-1" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {/* 换一批按钮 */}
                    <div className="mt-4 text-center">
                      <Button
                        onClick={handleRefresh}
                        disabled={isQueryLoading || !ocrResult}
                        variant="outline"
                        className="border-[#5D9BBD] text-[#5D9BBD] hover:bg-[#5D9BBD]/10"
                      >
                        <Shuffle className="w-4 h-4 mr-2" />
                        换一批
                      </Button>
                      {queryResult.meta?.tip && (
                        <p className="text-sm text-gray-500 mt-2">{queryResult.meta.tip}</p>
                      )}
                    </div>
                    
                    {/* 搜索信息 */}
                    {queryResult.meta && (
                      <div className="mt-4 p-3 bg-[#5D9BBD]/5 rounded-lg">
                        <p className="text-sm text-gray-600">
                          <span className="font-semibold">搜索关键词：</span>{queryResult.meta.keywords}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">{queryResult.meta.note}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[400px] text-center">
                    {errorMessage ? (
                      <div className="text-red-500">
                        <p>{errorMessage}</p>
                      </div>
                    ) : (
                      <>
                        <BookOpen className="w-16 h-16 text-gray-300 mb-4" />
                        <p className="text-gray-400">
                          {ocrResult && !ocrResult.startsWith('识别失败') && !ocrResult.startsWith('OCR')
                            ? '点击"查询案例"按钮搜索相关内容'
                            : '请先上传图片并识别文字'}
                        </p>
                      </>
                    )}
                    {isQueryLoading && (
                      <div className="mt-4">
                        <Loader2 className="w-6 h-6 animate-spin text-[#5D9BBD] mx-auto" />
                        <p className="text-sm text-gray-400 mt-2">正在从权威媒体搜索案例...</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 数据来源说明 */}
        <div className="mt-8 p-4 rounded-lg bg-[#023047]/5 border border-[#023047]/20">
          <h4 className="font-semibold mb-2" style={{ color: '#023047' }}>
            数据来源说明
          </h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>案例仅来自：人民网、新华网、央视网、浙江在线、求是网</li>
            <li>时间范围：近三年热点案例聚焦时政热点</li>
            <li>严格匹配当前教材章节内容</li>
          </ul>
        </div>

        {/* 底部说明 */}
        <footer className="mt-8 text-center text-sm text-gray-500">
          <p>本工具仅供教育学习使用</p>
          <p className="mt-1" style={{ color: '#A8A8A8' }}>
            思政教育 · 智能辅助
          </p>
        </footer>
      </div>
    </div>
  );
}
