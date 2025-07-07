// auth-worker.js
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // 登录接口
    if (url.pathname === "/api/login" && request.method === "POST") {
      return await handleLogin(request, env);
    }
    
    // 验证会话接口
    if (url.pathname === "/api/verify" && request.method === "GET") {
      return await verifySession(request, env);
    }
    
    // 其他请求
    return new Response("Not found", { status: 404 });
  },
};

// 处理登录请求
async function handleLogin(request, env) {
  const { username, password, deviceId } = await request.json();
  
  // 从KV中获取用户数据
  const userData = await env.USER_KV.get(username);
  if (!userData) {
    return new Response("Invalid credentials", { status: 401 });
  }
  
  const user = JSON.parse(userData);
  
  // 验证密码
  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return new Response("Invalid credentials", { status: 401 });
  }
  
  // 检查权限时间
  const now = new Date();
  const validFrom = new Date(user.validFrom);
  const validTo = new Date(user.validTo);
  
  if (now < validFrom || now > validTo) {
    return new Response("Login period expired", { status: 403 });
  }
  
  // 检查设备绑定
  if (user.deviceId && user.deviceId !== deviceId) {
    return new Response("Access denied: Device mismatch", { status: 403 });
  }
  
  // 更新设备ID和登录时间
  user.deviceId = deviceId;
  user.lastLogin = now.toISOString();
  await env.USER_KV.put(username, JSON.stringify(user));
  
  // 生成会话令牌 (JWT)
  const token = generateJwtToken(username, env.JWT_SECRET);
  
  return new Response(JSON.stringify({ token }), {
    headers: { "Content-Type": "application/json" },
  });
}

// 验证会话
async function verifySession(request, env) {
  const token = request.headers.get("Authorization")?.split(" ")[1];
  
  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }
  
  try {
    const payload = verifyJwtToken(token, env.JWT_SECRET);
    const username = payload.username;
    
    // 检查用户是否存在且权限有效
    const userData = await env.USER_KV.get(username);
    if (!userData) {
      return new Response("User not found", { status: 404 });
    }
    
    const user = JSON.parse(userData);
    const now = new Date();
    const validFrom = new Date(user.validFrom);
    const validTo = new Date(user.validTo);
    
    if (now < validFrom || now > validTo) {
      return new Response("Login period expired", { status: 403 });
    }
    
    return new Response(JSON.stringify({ username, validTo: user.validTo }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response("Invalid token", { status: 401 });
  }
}

// JWT工具函数 (简化版)
function generateJwtToken(username, secret) {
  // 实际实现需要使用加密库，如jsonwebtoken
  const header = { alg: "HS256", typ: "JWT" };
  const payload = { username, exp: Math.floor(Date.now() / 1000) + 86400 };
  
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));
  const signature = btoa(`${encodedHeader}.${encodedPayload}.${secret}`);
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function verifyJwtToken(token, secret) {
  // 实际实现需要验证签名和过期时间
  const [encodedHeader, encodedPayload] = token.split(".");
  return JSON.parse(atob(encodedPayload));
}

// 验证密码 (使用bcrypt)
async function verifyPassword(password, hash) {
  // 实际实现需要使用bcrypt库
  // 这里简化为示例
  return password === hash; // 替换为实际的bcrypt比较
}