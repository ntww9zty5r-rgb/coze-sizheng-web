import { NextRequest, NextResponse } from 'next/server';
import { SearchClient, LLMClient, Config } from 'coze-coding-dev-sdk';

interface CaseItem {
  title: string;
  summary: string;
  source: string;
  publishTime: string;
  webUrl: string;
  imageUrl: string;
  videoUrl: string | null;
}

// 合法的来源域名
const VALID_SOURCES: Record<string, string> = {
  'people.com.cn': '人民网',
  'xinhuanet.com': '新华网',
  'cctv.com': '央视网',
  'cztv.com': '浙江在线',
  'qstheory.cn': '求是网',
};

// 扩展的有效子域名
const VALID_SUBDOMAINS: Record<string, string> = {
  'paper.people.com.cn': '人民网',
  'politics.people.com.cn': '人民网',
  'opinion.people.com.cn': '人民网',
  'society.people.com.cn': '人民网',
  'health.people.com.cn': '人民网',
  'news.cn': '新华网',
  'www.news.cn': '新华网',
  'politics.xinhuanet.com': '新华网',
  'society.xinhuanet.com': '新华网',
  'www.cctv.com': '央视网',
  'news.cctv.com': '央视网',
  'www.cztv.com': '浙江在线',
  'zjnews.cztv.com': '浙江在线',
  'zj.zjol.com.cn': '浙江在线',
  'www.qstheory.cn': '求是网',
};

/**
 * 从URL提取域名
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.toLowerCase();
  } catch {
    return '';
  }
}

/**
 * 判断URL是否来自合法来源
 */
function getSourceFromUrl(url: string): string | null {
  if (!url) return null;
  
  const hostname = extractDomain(url);
  if (!hostname) return null;
  
  if (VALID_SUBDOMAINS[hostname]) {
    return VALID_SUBDOMAINS[hostname];
  }
  
  for (const [domain, name] of Object.entries(VALID_SOURCES)) {
    if (hostname === domain || hostname.endsWith('.' + domain)) {
      return name;
    }
  }
  
  return null;
}

/**
 * 判断是否为理论/政策类文章
 */
function isTheoryOrPolicyArticle(title: string, snippet: string): boolean {
  const theoryKeywords = [
    '思想', '理论', '解读', '评论', '学习', '贯彻', '落实',
    '宣讲', '研讨', '体会', '心得', '报告', '讲话', '精神',
    '征文', '笔谈', '综述'
  ];
  
  const titleLower = title.toLowerCase();
  let theoryCount = 0;
  for (const kw of theoryKeywords) {
    if (titleLower.includes(kw)) theoryCount++;
  }
  
  if (theoryCount >= 2) return true;
  if (title.includes('思想摘编') || title.includes('理论摘编') || 
      title.includes('重要论述')) return true;
  
  return false;
}

/**
 * 打乱数组顺序
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * 生成随机搜索关键词组合
 */
function generateRandomKeywords(baseKeywords: string): string[] {
  const base = baseKeywords.split(' ').filter(k => k.length > 0);
  
  // 多样化的搜索角度
  const searchTemplates = [
    // 人物故事类
    () => [...base, '人物故事', '感人事迹'].join(' '),
    () => [...base, '先进典型', '榜样力量'].join(' '),
    () => [...base, '凡人善举', '暖心事'].join(' '),
    () => [...base, '时代楷模', '最美人物'].join(' '),
    // 时事热点类
    () => [...base, '时政热点', '新闻事件'].join(' '),
    () => [...base, '社会关注', '引发热议'].join(' '),
    () => [...base, '热搜话题', '刷屏故事'].join(' '),
    // 实践成效类
    () => [...base, '创新做法', '成功经验'].join(' '),
    () => [...base, '实践探索', '成效显著'].join(' '),
    () => [...base, '生动故事', '真实案例'].join(' '),
    // 青春正能量类
    () => [...base, '青年担当', '青春力量'].join(' '),
    () => [...base, '奋斗故事', '追梦人'].join(' '),
    () => [...base, '乡村振兴', '基层故事'].join(' '),
    // 不同角度
    () => [...base, '2024 2025'].join(' '),
    () => [...base, '温暖瞬间'].join(' '),
    () => [...base, '身边故事'].join(' '),
  ];
  
  // 随机选择多个搜索角度
  const shuffledTemplates = shuffleArray(searchTemplates);
  return shuffledTemplates.slice(0, 6).map(fn => fn());
}

/**
 * 搜索生动、有生活气息的热点案例
 */
async function searchCases(keyword: string): Promise<CaseItem[]> {
  const config = new Config();
  const searchClient = new SearchClient(config);
  const llmClient = new LLMClient(config);
  
  const allCases: CaseItem[] = [];
  const foundUrls = new Set<string>();
  
  // 生成随机搜索关键词组合
  const searchQueries = generateRandomKeywords(keyword);
  
  try {
    for (const query of searchQueries) {
      if (allCases.length >= 10) break;
      
      try {
        const response = await searchClient.advancedSearch(query, {
          count: 15,
          needContent: true,
          needUrl: true,
          needSummary: true,
          timeRange: '3y', // 近三年
        });
        
        if (response.web_items) {
          for (const item of response.web_items) {
            if (allCases.length >= 15) break;
            
            // 跳过已存在的URL
            if (!item.url || foundUrls.has(item.url)) continue;
            
            const source = getSourceFromUrl(item.url);
            if (!source) continue;
            
            // 过滤理论文章
            const snippet = item.snippet || '';
            if (isTheoryOrPolicyArticle(item.title, snippet)) continue;
            
            foundUrls.add(item.url);
            
            // 生成摘要
            let summary = '';
            try {
              if (item.content && item.content.length > 50) {
                const summaryResponse = await llmClient.invoke([
                  {
                    role: 'user',
                    content: `请将以下内容概括为80-120字的故事性摘要，用于思政教育案例。要求：
1. 突出人物事迹或具体事件
2. 语言生动、有画面感
3. 突出教育意义
4. 不要使用引号

内容：${item.content.substring(0, 1000)}`
                  }
                ], { temperature: 0.7 }); // 提高随机性
                summary = summaryResponse.content.trim().substring(0, 120);
              } else {
                summary = snippet.substring(0, 120);
              }
            } catch {
              summary = snippet.substring(0, 120);
            }
            
            // 格式化发布时间
            let publishTime = '';
            if (item.publish_time) {
              try {
                const date = new Date(item.publish_time);
                publishTime = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
              } catch {
                publishTime = item.publish_time;
              }
            }
            
            allCases.push({
              title: item.title,
              summary: summary,
              source: source,
              publishTime: publishTime,
              webUrl: item.url,
              imageUrl: item.logo_url || '',
              videoUrl: null,
            });
          }
        }
      } catch (error) {
        console.error(`Search error for query "${query}":`, error);
      }
    }
  } catch (error) {
    console.error('Search error:', error);
  }
  
  // 打乱所有案例顺序
  const shuffledCases = shuffleArray(allCases);
  
  // 从不同来源选取案例
  const resultCases: CaseItem[] = [];
  const usedSources = new Set<string>();
  
  for (const c of shuffledCases) {
    if (resultCases.length >= 3) break;
    if (!usedSources.has(c.source)) {
      resultCases.push(c);
      usedSources.add(c.source);
    }
  }
  
  return resultCases;
}

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: '未提供查询文本' },
        { status: 400 }
      );
    }

    // 分析教材内容，提取关键词
    const config = new Config();
    const llmClient = new LLMClient(config);
    
    const analysisPrompt = `请分析以下思政教材内容，提取适合搜索生动案例的关键词。要求：
1. 提取能搜索到具体人物事迹、真实故事的关键词
2. 避免抽象的理论概念
3. 优先提取具体的主题词
4. 只输出3-5个关键词，用空格分隔，不要其他说明

教材内容：
${text}`;

    const analysisResponse = await llmClient.invoke([
      { role: 'user', content: analysisPrompt }
    ], { temperature: 0.3 });

    const keywords = analysisResponse.content.trim();
    
    // 搜索案例
    const cases = await searchCases(keywords);

    return NextResponse.json({
      cases: cases,
      meta: {
        total: cases.length,
        keywords: keywords,
        validSources: Object.values(VALID_SOURCES),
        timeRange: '近三年热点案例聚焦时政热点',
        tip: '点击"换一批"按钮可获取更多不同案例',
        note: cases.length > 0 
          ? '案例均来自权威媒体，每次查询结果不同' 
          : '未找到符合条件的案例'
      }
    });

  } catch (error) {
    console.error('Query error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : '案例查询失败',
      },
      { status: 500 }
    );
  }
}
