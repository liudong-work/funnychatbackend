import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs-extra';
import { authenticateToken } from '../middleware/auth.js';
import { log } from '../config/logger.js';
import { FILE_TYPE_MAP, IMAGE_EXTENSIONS, AUDIO_EXTENSIONS, VIDEO_EXTENSIONS } from '../utils/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// 配置multer上传中间件 - 模仿Go版本的文件处理
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 确保uploads目录存在
    const uploadDir = path.join(__dirname, '../../uploads');
    fs.ensureDirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名 - 模仿Go版本的UUID文件命名
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
    cb(null, filename);
  }
});

// 文件类型过滤
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimetype = file.mimetype;

  // 允许的文件类型 - 模仿Go版本支持的文件类型
  const allowedMimes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'audio/mpeg', 'audio/wav', 'audio/webm',
    'video/mp4', 'video/webm', 'video/avi',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ];

  if (allowedMimes.includes(mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('不支持的文件类型'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB限制
    fieldSize: 1024 * 1024 // 1MB字段限制
  }
});

/**
 * 检测文件类型
 */
function detectFileType(buffer) {
  // 检查文件头 - 模仿Go版本的文件类型识别
  const hex = buffer.toString('hex', 0, 8).toUpperCase();
  
  for (const [magic, type] of FILE_TYPE_MAP) {
    if (hex.startsWith(magic)) {
      return type;
    }
  }
  
  return 'unknown';
}

/**
 * 根据文件扩展名判断内容类型
 */
function getContentTypeByExtension(filename) {
  const ext = path.extname(filename).toLowerCase().slice(1);
  
  if (IMAGE_EXTENSIONS.includes(ext)) return 3; // 图片
  if (AUDIO_EXTENSIONS.includes(ext)) return 4; // 音频
  if (VIDEO_EXTENSIONS.includes(ext)) return 5; // 视频
  return 2; // 普通文件
}

/**
 * 文件上传接口 - POST /api/file
 * 模仿Go版本的文件上传处理
 */
router.post('/file', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: false,
        message: '没有上传文件'
      });
    }

    const file = req.file;
    
    // 检测文件类型
    const fileBuffer = await fs.readFile(path.join(file.path));
    const detectedType = detectFileType(fileBuffer);
    const contentType = getContentTypeByExtension(file.originalname);

    log.info(`文件上传成功: ${file.filename}, 大小: ${file.size} bytes, 类型: ${detectedType}`);

    res.json({
      status: true,
      message: '文件上传成功',
      data: {
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        contentType: contentType,
        detectedType: detectedType,
        url: `/api/file/${file.filename}`,
        downloadUrl: `/api/file/download/${file.filename}`
      }
    });

  } catch (error) {
    log.error('文件上传失败:', error);
    res.status(500).json({
      status: false,
      message: '文件上传失败',
      error: error.message
    });
  }
});

/**
 * 文件访问接口 - GET /api/file/:filename
 * 模仿Go版本的静态文件服务
 */
router.get('/file/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    
    // 安全检查：防止路径遍历攻击
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(403).json({
        status: false,
        message: '非法的文件名'
      });
    }

    const filepath = path.join(__dirname, '../../uploads', filename);

    // 检查文件是否存在
    if (!await fs.pathExists(filepath)) {
      return res.status(404).json({
        status: false,
        message: '文件不存在'
      });
    }

    // 获取文件信息
    const stats = await fs.stat(filepath);
    const mimetype = getMimeType(filename);

    // 设置响应头
    res.setHeader('Content-Type', mimetype);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1年缓存

    // 流式传输文件
    const fileStream = fs.createReadStream(filepath);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      log.error('文件读取错误:', error);
      if (!res.headersSent) {
        res.status(500).json({
          status: false,
          message: '文件读取失败'
        });
      }
    });

  } catch (error) {
    log.error('文件访问失败:', error);
      res.status(500).json({
        status: false,
        message: '文件访问失败'
    });
  }
});

/**
 * 文件下载接口 - GET /api/file/download/:filename
 * 强制下载文件
 */
router.get('/file/download/:filename', authenticateToken, async (req, res) => {
  try {
    const filename = req.params.filename;
    
    // 安全检查
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(403).json({
        status: false,
        message: '非法的文件名'
      });
    }

    const filepath = path.join(__dirname, '../../uploads', filename);

    // 检查文件是否存在
    if (!await fs.pathExists(filepath)) {
      return res.status(404).json({
        status: false,
        message: '文件不存在'
      });
    }

    // 设置下载响应头
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Type', 'application/octet-stream');

    // 流式传输文件
    const fileStream = fs.createReadStream(filepath);
    fileStream.pipe(res);

  } catch (error) {
    log.error('文件下载失败:', error);
    res.status(500).json({
      status: false,
      message: '文件下载失败'
    });
  }
});

/**
 * 获取MIME类型
 */
function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.avi': 'video/avi',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.txt': 'text/plain'
  };

  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * 获取文件列表 - GET /api/files
 * 管理员功能，获取服务器文件列表
 */
router.get('/files', authenticateToken, async (req, res) => {
  try {
    const uploadsDir = path.join(__dirname, '../../uploads');
    const files = await fs.readdir(uploadsDir);
    
    const fileList = [];
    for (const file of files) {
      const filepath = path.join(uploadsDir, file);
      const stats = await fs.stat(filepath);
      
      fileList.push({
        filename: file,
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        url: `/api/file/${file}`
      });
    }

    res.json({
      status: true,
      message: '获取文件列表成功',
      data: fileList
    });

  } catch (error) {
    log.error('获取文件列表失败:', error);
    res.status(500).json({
      status: false,
      message: '获取文件列表失败'
    });
  }
});

export default router;


