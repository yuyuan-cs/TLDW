# 新功能说明 / New Features

## 概述 / Overview

本次更新为 TLDW 项目添加了三个主要功能：

1. **Bilibili 视频支持** - 支持分析 Bilibili 视频
2. **本地视频上传** - 支持上传本地视频及字幕文件
3. **视频合集管理** - 批量管理和组织视频系列

---

## 1. Bilibili 视频支持

### 功能说明
- 支持解析 Bilibili 视频 URL（BV号和AV号）
- 自动获取视频信息（标题、作者、封面等）
- 自动提取视频字幕进行分析

### 支持的 URL 格式
```
https://www.bilibili.com/video/BVxxxxxxxxx
https://www.bilibili.com/video/avxxxxxxxx
https://b23.tv/xxxxxxx
```

### 使用方法
1. 在主页输入框粘贴 Bilibili 视频链接
2. 点击提交按钮
3. 系统自动提取字幕并生成分析

### API 端点
- `POST /api/bilibili/video-info` - 获取 Bilibili 视频信息
- `POST /api/bilibili/transcript` - 获取 Bilibili 视频字幕

---

## 2. 本地视频上传

### 功能说明
- 支持上传本地视频文件（MP4, WebM, OGG, MOV）
- 支持上传字幕文件（SRT, VTT）
- 自动解析字幕文件并生成时间轴
- 视频文件存储在 Supabase Storage

### 限制
- 视频文件大小：最大 500MB
- 支持的视频格式：MP4, WebM, OGG, MOV
- 支持的字幕格式：SRT, VTT
- **需要登录** - 上传本地视频需要用户认证

### 使用方法
1. 在主页切换到"Local Upload"标签
2. 点击"Select Video"选择视频文件
3. 点击"Select Subtitle"选择字幕文件
4. 填写视频标题（必填）和作者（可选）
5. 点击"Upload & Analyze"上传并分析

### API 端点
- `POST /api/local/upload-video` - 上传视频文件
- `POST /api/local/upload-subtitle` - 上传并解析字幕文件

### 字幕格式示例

#### SRT 格式
```srt
1
00:00:00,000 --> 00:00:05,000
这是第一句字幕

2
00:00:05,000 --> 00:00:10,000
这是第二句字幕
```

#### VTT 格式
```vtt
WEBVTT

00:00:00.000 --> 00:00:05.000
这是第一句字幕

00:00:05.000 --> 00:00:10.000
这是第二句字幕
```

---

## 3. 视频合集管理

### 功能说明
- 创建视频合集来组织相关视频
- 将分析过的视频添加到合集
- 按顺序管理合集中的视频
- 从合集详情页快速访问视频

### 使用方法

#### 创建合集
1. 访问 `/collections` 页面
2. 点击"New Collection"按钮
3. 输入合集标题和描述（可选）
4. 点击"Create"创建合集

#### 添加视频到合集
1. 在视频分析页面，找到"Add to Collection"按钮
2. 选择要添加到的合集
3. 视频会自动添加到合集末尾

#### 管理合集
- 查看合集列表：访问 `/collections`
- 查看合集详情：点击合集卡片
- 删除视频：在合集详情页点击视频旁的删除按钮
- 删除合集：在合集列表页点击合集的删除按钮

### API 端点
- `GET /api/collections` - 获取用户的所有合集
- `POST /api/collections` - 创建新合集
- `DELETE /api/collections` - 删除合集
- `GET /api/collections/[id]` - 获取合集详情
- `PATCH /api/collections/[id]` - 更新合集信息
- `POST /api/collections/[id]/videos` - 添加视频到合集
- `DELETE /api/collections/[id]/videos` - 从合集移除视频

---

## 数据库变更

### 新增表

#### video_collections
```sql
- id: UUID (主键)
- user_id: UUID (外键 -> auth.users)
- title: TEXT (合集标题)
- description: TEXT (合集描述)
- thumbnail: TEXT (封面图)
- video_count: INTEGER (视频数量)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

#### collection_videos
```sql
- id: UUID (主键)
- collection_id: UUID (外键 -> video_collections)
- video_analysis_id: UUID (外键 -> video_analyses)
- order: INTEGER (排序)
- added_at: TIMESTAMPTZ
```

### 修改表

#### video_analyses
- 新增字段：`source` TEXT (视频来源: 'youtube', 'bilibili', 'local')

---

## 技术实现

### 视频源检测
```typescript
// 自动检测视频来源
import { detectVideoSource } from '@/lib/utils';

const source = detectVideoSource(url);
// 返回: 'youtube' | 'bilibili' | null
```

### 字幕解析
```typescript
// 解析 SRT/VTT 字幕文件
import { parseSubtitle } from '@/lib/subtitle-parser';

const transcript = parseSubtitle(content, filename);
// 返回: TranscriptSegment[]
```

### Bilibili API
```typescript
// 获取 Bilibili 视频信息
const response = await fetch('/api/bilibili/video-info', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: bilibiliUrl })
});

// 获取 Bilibili 字幕
const response = await fetch('/api/bilibili/transcript', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: bilibiliUrl })
});
```

---

## 环境配置

无需额外的环境变量。现有的 Supabase 配置即可支持新功能。

### Supabase Storage
确保在 Supabase 项目中已创建 `videos` bucket：
1. 登录 Supabase Dashboard
2. 进入 Storage 页面
3. 运行迁移脚本或手动创建 `videos` bucket
4. 设置为 public（允许用户访问上传的视频）

---

## 迁移指南

### 1. 数据库迁移
运行以下迁移脚本：
```bash
# 在 Supabase SQL Editor 中执行
supabase/migrations/20240101000000_add_collections.sql
supabase/migrations/20240101000001_add_videos_storage.sql
```

### 2. 更新依赖
项目已包含所有必要依赖，无需额外安装。

### 3. 测试功能
1. 测试 Bilibili 视频分析
2. 测试本地视频上传（需要登录）
3. 测试合集创建和管理

---

## 常见问题

### Q: Bilibili 视频没有字幕怎么办？
A: 系统会自动检测字幕。如果视频没有字幕，会返回 404 错误并提示用户。

### Q: 本地视频上传失败？
A: 检查以下几点：
- 是否已登录
- 视频文件大小是否超过 500MB
- 视频格式是否支持
- 字幕文件格式是否正确

### Q: 合集功能需要登录吗？
A: 是的，视频合集功能需要用户认证。

### Q: 可以将 YouTube 和 Bilibili 视频放在同一个合集吗？
A: 可以！合集支持混合不同来源的视频。

---

## 未来计划

- [ ] 支持更多视频平台（优酷、腾讯视频等）
- [ ] 自动字幕生成（语音识别）
- [ ] 批量上传视频到合集
- [ ] 合集分享功能
- [ ] 视频下载功能

---

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

与主项目保持一致
