// auth-worker.js
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // ��¼�ӿ�
    if (url.pathname === "/api/login" && request.method === "POST") {
      return await handleLogin(request, env);
    }
    
    // ��֤�Ự�ӿ�
    if (url.pathname === "/api/verify" && request.method === "GET") {
      return await verifySession(request, env);
    }
    
    // ��������
    return new Response("Not found", { status: 404 });
  },
};

// �����¼����
async function handleLogin(request, env) {
  const { username, password, deviceId } = await request.json();
  
  // ��KV�л�ȡ�û�����
  const userData = await env.USER_KV.get(username);
  if (!userData) {
    return new Response("Invalid credentials", { status: 401 });
  }
  
  const user = JSON.parse(userData);
  
  // ��֤����
  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return new Response("Invalid credentials", { status: 401 });
  }
  
  // ���Ȩ��ʱ��
  const now = new Date();
  const validFrom = new Date(user.validFrom);
  const validTo = new Date(user.validTo);
  
  if (now < validFrom || now > validTo) {
    return new Response("Login period expired", { status: 403 });
  }
  
  // ����豸��
  if (user.deviceId && user.deviceId !== deviceId) {
    return new Response("Access denied: Device mismatch", { status: 403 });
  }
  
  // �����豸ID�͵�¼ʱ��
  user.deviceId = deviceId;
  user.lastLogin = now.toISOString();
  await env.USER_KV.put(username, JSON.stringify(user));
  
  // ���ɻỰ���� (JWT)
  const token = generateJwtToken(username, env.JWT_SECRET);
  
  return new Response(JSON.stringify({ token }), {
    headers: { "Content-Type": "application/json" },
  });
}

// ��֤�Ự
async function verifySession(request, env) {
  const token = request.headers.get("Authorization")?.split(" ")[1];
  
  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }
  
  try {
    const payload = verifyJwtToken(token, env.JWT_SECRET);
    const username = payload.username;
    
    // ����û��Ƿ������Ȩ����Ч
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

// JWT���ߺ��� (�򻯰�)
function generateJwtToken(username, secret) {
  // ʵ��ʵ����Ҫʹ�ü��ܿ⣬��jsonwebtoken
  const header = { alg: "HS256", typ: "JWT" };
  const payload = { username, exp: Math.floor(Date.now() / 1000) + 86400 };
  
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));
  const signature = btoa(`${encodedHeader}.${encodedPayload}.${secret}`);
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function verifyJwtToken(token, secret) {
  // ʵ��ʵ����Ҫ��֤ǩ���͹���ʱ��
  const [encodedHeader, encodedPayload] = token.split(".");
  return JSON.parse(atob(encodedPayload));
}

// ��֤���� (ʹ��bcrypt)
async function verifyPassword(password, hash) {
  // ʵ��ʵ����Ҫʹ��bcrypt��
  // �����Ϊʾ��
  return password === hash; // �滻Ϊʵ�ʵ�bcrypt�Ƚ�
}