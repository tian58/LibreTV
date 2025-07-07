// workers/auth/index.js
export default {
  async fetch(request, env, ctx) {
    // 数据库连接配置
    const db = env.D1;
    
    // 示例：创建用户
    const user = await db.execute(
      `INSERT INTO users (username, password_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [username, passwordHash, expiresAt]
    );
  }
};
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

// 会员类型配置
const PLAN_DURATION = {
  trial: 1,
  monthly: 30,
  quarterly: 90,
  annual: 365
};

// 用户注册逻辑
export default {
  async fetch(request, env, ctx) {
    const { action, ...data } = await request.json();
    
    if (action === 'register') {
      const expiresAt = new Date(Date.now() + PLAN_DURATION[data.plan] * 86400000);
      const user = await env.D1.execute(
        `INSERT INTO users (username, password_hash, expires_at, plan)
         VALUES ($1, $2, $3, $4)`,
        [data.username, await bcrypt.hash(data.password, 10), expiresAt, data.plan]
      );
      return new Response(JSON.stringify({ token: btoa(uuidv4()) }));
    }
  }
};
