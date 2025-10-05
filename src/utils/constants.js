// 消息类型常量
export const MESSAGE_TYPE = {
  USER: 1,   // 单聊
  GROUP: 2   // 群聊
};

// 消息内容类型常量
export const CONTENT_TYPE = {
  TEXT: 1,           // 文字
  FILE: 2,           // 普通文件
  IMAGE: 3,          // 图片
  AUDIO: 4,          // 音频
  VIDEO: 5,          // 视频
  AUDIO_ONLINE: 6,   // 语音通话
  VIDEO_ONLINE: 7    // 视频通话
};

// WebSocket消息类型
export const WS_MESSAGE_TYPE = {
  HEAT_BEAT: 'heatbeat',
  PONG: 'pong'
};

// 消息队列类型
export const CHANNEL_TYPE = {
  REDIS: 'redis',
  KAFKA: 'kafka'
};

// HTTP状态码
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
};

// 响应状态
export const RESPONSE_STATUS = {
  SUCCESS: true,
  FAIL: false
};

// 文件类型映射
export const FILE_TYPE_MAP = new Map([
  ['ffd8ffe000104a464946', 'jpg'],   // JPEG
  ['89504e470d0a1a0a0000', 'png'],   // PNG
  ['47494638396126026f01', 'gif'],   // GIF
  ['255044462d312e350d0a', 'pdf'],   // PDF
  ['504b0304140006000800', 'docx'],  // DOCX
  ['504b030414000600080000002100', 'xlsx'], // XLSX
  ['00000020667479706d70', 'mp4'],   // MP4
  ['49443303000000002176', 'mp3'],   // MP3
  ['52494646246009005741', 'wav'],   // WAV
  ['52494646', 'wav']                // WAV
]);

// 图片文件扩展名
export const IMAGE_EXTENSIONS = ['jpeg', 'jpg', 'png', 'gif', 'tif', 'bmp', 'webp'];

// 音频文件扩展名
export const AUDIO_EXTENSIONS = ['mp3', 'wma', 'wav', 'mid', 'ape', 'flac', 'aac', 'ogg'];

// 视频文件扩展名
export const VIDEO_EXTENSIONS = ['mp4', 'avi', 'wmv', 'flv', 'webm', 'mkv', 'mov', 'm4v'];

// WebSocket事件名称
export const WS_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  MESSAGE: 'message',
  HEARTBEAT: 'heartbeat',
  ERROR: 'error'
};
