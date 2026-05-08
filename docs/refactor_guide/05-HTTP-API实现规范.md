# HTTP API 实现规范 v6.0

> **版本：** v6.0（简化版，替代 WebSocket query 和 face_management）
> **日期：** 2026-05-05
> **状态：** 待实施
> **依赖：** 00-总体通信协议规范、03-Server-App-WebSocket协议规范、04-协议实施指南

---

## 1. 背景

根据文档03 §9，以下功能从 WebSocket 迁移到 HTTP API：

| 原 WebSocket 功能 | 原消息类型 | 新 HTTP API |
|---|---|---|
| 查询设备状态 | `query` (target=status) | `GET /api/doorlock/status` |
| 人脸列表/注册 | `face_management` (register/get_persons/...) | `GET/POST /api/doorlock/faces` |
| 查询事件历史 | `query` (target=events) | `GET /api/doorlock/events` |
| 查询开锁日志 | `query` (target=unlock_logs) | `GET /api/doorlock/unlock_logs` |
| 查询媒体文件 | `query` (target=media_files) | `GET /api/doorlock/media` |
| 下载媒体文件 | `media_download` / `media_download_chunk` | `GET /api/doorlock/media/<id>` |
| 删除人脸 | `face_management` (delete_person) | `DELETE /api/doorlock/faces/<id>` |
| 更新权限 | `face_management` (update_permission) | `PUT /api/doorlock/faces/<id>/permission` |
| 查询到访记录 | `face_management` (get_visits) | `GET /api/doorlock/visits` |
| 查询密码 | `query` (target=password) | `GET /api/doorlock/password` |

**迁移原因**（文档03 §9.1）：HTTP 天然是请求-响应模式，无需 seq_id 匹配；大体积响应（历史日志、图片）不阻塞 WebSocket 实时推送。

---

## 2. 实施优先级

### 2.1 第一阶段（必须实现）

这些 API 替代当前 WebSocket 消息的核心功能，**删除原 WebSocket handler 之前必须先实现**：

| 端点 | 方法 | 用途 | 原因 |
|------|------|------|------|
| `/api/doorlock/status` | GET | 查询设备当前状态 | App 打开首页时需要 |
| `/api/doorlock/faces` | GET | 查询人脸列表 | 替代 face_management get_persons |
| `/api/doorlock/faces` | POST | 注册人脸 | 替代 face_management register |
| `/api/doorlock/faces/<id>` | DELETE | 删除人脸 | 替代 face_management delete_person |
| `/api/doorlock/faces/<id>/permission` | PUT | 更新权限 | 替代 face_management update_permission |
| `/api/doorlock/visits` | GET | 到访记录列表 | 替代 face_management get_visits |

### 2.2 第二阶段（后续实现）

| 端点 | 方法 | 用途 |
|------|------|------|
| `/api/doorlock/events` | GET | 查询事件历史 |
| `/api/doorlock/unlock_logs` | GET | 查询开锁日志 |
| `/api/doorlock/media` | GET | 查询媒体文件列表 |
| `/api/doorlock/media/<id>` | GET | 下载媒体文件 |
| `/api/doorlock/media/download` | GET | 按路径下载图片（`?path=...`） |
| `/api/doorlock/password` | GET | 查询设备密码 |

第二阶段 API 可在 WebSocket handler 删除后逐步实现，初期 App 可暂时使用实时推送 + 本地缓存。

---

## 3. 认证方式

所有 HTTP API 使用 **HTTP Header JWT 认证**，与现有视觉分析接口 (`/mcp/vision/explain`) 保持一致：

```
Authorization: Bearer <token>
```

**Token 生成**：使用 `core/utils/auth.py` 中的 `AuthToken` 类，密钥来自 `config["server"]["auth_key"]`。

**认证流程**：
1. App 首先通过 WebSocket hello 获取 token（在 hello 响应中返回），或使用预设的共享密钥生成 token
2. 后续所有 HTTP 请求携带 `Authorization: Bearer <token>` header
3. 服务器验证 token 有效性，提取 `device_id`
4. 对于设备相关操作，验证请求的 `device_id` 与 token 中的一致

**注意**：对于 App 端发起的请求，还需要验证 App 有权限访问该设备（即 App 的 `app_id` 与该设备有绑定关系）。此验证逻辑在 WebSocket hello 认证时已建立关联，HTTP API 层需要复用此关联关系。

---

## 4. 统一响应格式

所有 API 响应使用统一格式：

```json
// 成功
{
  "success": true,
  "data": { ... }
}

// 失败
{
  "success": false,
  "message": "错误描述"
}
```

这与现有 HTTP API（`doorlock_config_handler.py`、`vision_handler.py`）的响应格式保持一致。

分页查询在 `data` 中额外包含：

```json
{
  "success": true,
  "data": {
    "records": [...],
    "total": 100,
    "page": 1,
    "page_size": 20
  }
}
```

---

## 5. 实现架构

### 5.1 文件组织

```
core/api/
  base_handler.py          # 已有 - API 基类
  ota_handler.py           # 已有 - OTA
  vision_handler.py        # 已有 - 视觉分析
  doorlock_config_handler.py    # 已有 - 门锁配置
  doorlock_guard_handler.py     # 已有 - 看护模式
  doorlock_welcome_handler.py   # 已有 - 欢迎词
  doorlock_history_handler.py   # 已有 - 历史查询
  doorlock_api_handler.py       # 新增 - 门锁核心 API（status/faces/visits/password）
  doorlock_media_handler.py     # 新增 - 媒体文件下载
```

### 5.2 路由注册（http_server.py 修改）

在 `SimpleHttpServer.__init__` 中新增：

```python
from core.api.doorlock_api_handler import DoorlockApiHandler
from core.api.doorlock_media_handler import DoorlockMediaHandler

self.doorlock_api_handler = DoorlockApiHandler(config)
self.doorlock_media_handler = DoorlockMediaHandler(config)
```

在 `start()` 方法的 `app.add_routes()` 中新增：

```python
# 第一阶段：核心 API
web.get("/api/doorlock/status", self.doorlock_api_handler.handle_get_status),
web.get("/api/doorlock/faces", self.doorlock_api_handler.handle_get_faces),
web.post("/api/doorlock/faces", self.doorlock_api_handler.handle_post_faces),
web.delete("/api/doorlock/faces/{face_id}", self.doorlock_api_handler.handle_delete_face),
web.put("/api/doorlock/faces/{face_id}/permission", self.doorlock_api_handler.handle_update_permission),
web.get("/api/doorlock/visits", self.doorlock_api_handler.handle_get_visits),
web.options("/api/doorlock/status", self.doorlock_api_handler.handle_options),
# ... 为每个端点添加 options

# 第二阶段：扩展 API
web.get("/api/doorlock/events", self.doorlock_api_handler.handle_get_events),
web.get("/api/doorlock/unlock_logs", self.doorlock_api_handler.handle_get_unlock_logs),
web.get("/api/doorlock/media", self.doorlock_media_handler.handle_get_list),
web.get("/api/doorlock/media/{file_id}", self.doorlock_media_handler.handle_download),
web.get("/api/doorlock/media/download", self.doorlock_media_handler.handle_download_by_path),
web.get("/api/doorlock/password", self.doorlock_api_handler.handle_get_password),
```

### 5.3 数据访问层

所有 API handler 通过现有的 `FaceService` / `DoorlockDatabase` 访问数据，不直接操作数据库：

```python
from core.handle.textHandler.faceRecognitionHandler import get_face_service

class DoorlockApiHandler:
    def __init__(self, config):
        self.config = config
        self.auth = AuthToken(config["server"]["auth_key"])
    
    def _get_service(self, logger=None):
        return get_face_service(logger)
```

---

## 6. API 详细规范

### 6.1 GET /api/doorlock/status — 查询设备状态

**请求**：
```
GET /api/doorlock/status?device_id=AA:BB:CC:DD:EE:FF
Authorization: Bearer <token>
```

**成功响应 (200)**：
```json
{
  "success": true,
  "data": {
    "battery": 85,
    "lux": 300,
    "lock_state": 0,
    "light_state": 1,
    "last_update": 1702234567890
  }
}
```

**数据来源**：优先从 ESP32 连接对象的 `device_status` 属性读取（内存缓存），fallback 到数据库最新记录。与当前 `QueryHandler._query_status` 逻辑一致。

---

### 6.2 GET /api/doorlock/faces — 人员列表

**请求**：
```
GET /api/doorlock/faces?page=1&page_size=20
Authorization: Bearer <token>
```

**成功响应 (200)**：
```json
{
  "success": true,
  "data": {
    "records": [
      {
        "id": 5,
        "name": "张三",
        "relation_type": "family",
        "permission": {"access": true, "time_range": null},
        "face_count": 3,
        "created_at": "2024-12-10T14:30:00"
      }
    ],
    "total": 10,
    "page": 1,
    "page_size": 20
  }
}
```

**实现**：调用 `face_service.get_persons()`（当前 `FaceManagementHandler._handle_get_persons` 已使用）。

---

### 6.3 POST /api/doorlock/faces — 注册人脸

**请求**：
```
POST /api/doorlock/faces
Content-Type: multipart/form-data
Authorization: Bearer <token>

字段：
  name: string (必填) - 人员姓名
  relation_type: string (可选，默认 "other") - 关系类型
  permission: string (可选) - 权限配置 JSON
  images: file[] (必填，1-5张) - 人脸图片（JPEG/PNG）
```

**成功响应 (200)**：
```json
{
  "success": true,
  "data": {
    "person_id": 6,
    "message": "录入成功"
  }
}
```

**实现**：解析 multipart 上传的图片，转为 base64 后调用 `face_service.register_face(name, relation_type, images, permission)`。

---

### 6.4 DELETE /api/doorlock/faces/{face_id} — 删除人脸

**请求**：
```
DELETE /api/doorlock/faces/5
Authorization: Bearer <token>
```

**成功响应 (200)**：
```json
{
  "success": true,
  "message": "删除成功"
}
```

---

### 6.5 PUT /api/doorlock/faces/{face_id}/permission — 更新权限

**请求**：
```
PUT /api/doorlock/faces/5/permission
Content-Type: application/json
Authorization: Bearer <token>

{
  "permission": {
    "access": true,
    "time_range": {"start": "08:00", "end": "22:00"}
  }
}
```

**成功响应 (200)**：
```json
{
  "success": true,
  "message": "权限更新成功"
}
```

---

### 6.6 GET /api/doorlock/visits — 到访记录

**请求**：
```
GET /api/doorlock/visits?page=1&page_size=20&date_from=2024-12-01&date_to=2024-12-31
Authorization: Bearer <token>
```

**成功响应 (200)**：
```json
{
  "success": true,
  "data": {
    "records": [
      {
        "visit_id": 123,
        "person_id": 5,
        "person_name": "张三",
        "relation": "family",
        "result": "known",
        "access_granted": true,
        "image_path": "faces/AA:BB:CC:DD:EE:FF/2024-12-11/face_1702234567890_5.jpg",
        "ts": 1702234567890
      }
    ],
    "total": 50,
    "page": 1,
    "page_size": 20
  }
}
```

**注意**：`image_path` 是服务器存储路径，App 通过 `GET /api/doorlock/media/download?path=...` 下载图片。

---

### 6.7 GET /api/doorlock/events — 事件历史（第二阶段）

```
GET /api/doorlock/events?device_id=AA:BB:CC:DD:EE:FF&event_type=bell&limit=50&offset=0
Authorization: Bearer <token>
```

响应格式与分页查询一致。实现直接复用 `QueryHandler._query_events` 中的数据库查询逻辑。

---

### 6.8 GET /api/doorlock/unlock_logs — 开锁日志（第二阶段）

```
GET /api/doorlock/unlock_logs?device_id=AA:BB:CC:DD:EE:FF&method=finger&limit=50&offset=0
```

---

### 6.9 GET /api/doorlock/media — 媒体文件列表（第二阶段）

```
GET /api/doorlock/media?device_id=AA:BB:CC:DD:EE:FF&file_type=face&date_from=2024-12-01&limit=50&offset=0
```

---

### 6.10 GET /api/doorlock/media/{file_id} — 下载媒体文件（第二阶段）

```
GET /api/doorlock/media/456
Authorization: Bearer <token>
```

返回文件二进制流，`Content-Type: image/jpeg`。

---

### 6.11 GET /api/doorlock/media/download — 按路径下载（第二阶段）

```
GET /api/doorlock/media/download?path=faces/AA:BB:CC:DD:EE:FF/2024-12-11/face_1702234567890_5.jpg
Authorization: Bearer <token>
```

用于 App 从 `visit_notification` 中的 `image_path` 直接下载图片。需做路径遍历安全检查。

---

### 6.12 GET /api/doorlock/password — 查询密码（第二阶段）

```
GET /api/doorlock/password?device_id=AA:BB:CC:DD:EE:FF
Authorization: Bearer <token>
```

**响应**：
```json
{
  "success": true,
  "data": {
    "password": "123456"
  }
}
```

---

## 7. 与 WebSocket handler 删除的依赖关系

以下 WebSocket handler **必须在对应 HTTP API 实现并验证后**才能删除：

| WebSocket Handler | 文件 | 依赖的 HTTP API |
|---|---|---|
| `FaceManagementHandler` | `faceRecognitionHandler.py` | `GET/POST /api/doorlock/faces`、`DELETE /api/doorlock/faces/<id>`、`PUT /api/doorlock/faces/<id>/permission`、`GET /api/doorlock/visits` |
| `QueryHandler` | `queryHandler.py` | `GET /api/doorlock/status`（第一阶段）；其余查询（第二阶段） |
| `MediaDownloadHandler`、`MediaDownloadChunkHandler` | `mediaDownloadHandler.py` | `GET /api/doorlock/media/<id>`、`GET /api/doorlock/media/download`（第二阶段） |

**注意**：`QueryHandler` 中的 `_query_status` 在第一阶段 HTTP API 实现后即可删除；其余查询方法（`_query_status_history`、`_query_events`、`_query_unlock_logs`、`_query_media_files`、`_query_password`）可保留到第二阶段。但整个 `QueryHandler` 类和 `TextMessageType.QUERY` 枚举应**在第二阶段完成后**统一删除。

---

## 8. 与现有 HTTP API 的一致性

新增 API 遵循现有 `doorlock_config_handler.py` 的代码风格：

1. 使用 `aiohttp.web.Request` / `web.Response`
2. 使用 `web.json_response()` 返回 JSON
3. 错误响应格式 `{success: false, message: "..."}` 
4. 每个端点提供 `handle_options()` 处理 CORS 预检
5. 使用 `logger` 记录错误（`from loguru import logger`）

---

## 9. 验证清单

- [ ] `GET /api/doorlock/status` 返回正确设备状态
- [ ] `POST /api/doorlock/faces` 成功上传人脸图片并录入
- [ ] `GET /api/doorlock/faces` 返回正确的人员列表
- [ ] `DELETE /api/doorlock/faces/5` 成功删除人脸并返回成功
- [ ] `PUT /api/doorlock/faces/5/permission` 成功更新权限
- [ ] `GET /api/doorlock/visits` 返回正确的到访记录分页
- [ ] 未认证请求返回 401
- [ ] 无效 device_id 返回适当错误
- [ ] 图片上传大小超过限制返回 400 错误
- [ ] CORS 预检请求正常工作
