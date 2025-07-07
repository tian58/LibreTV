// workers/auth/login.js
export default {
  async fetch(request) {
    const { username, password } = await request.json();
    const user = await env.D1.oneOrNone(
      'SELECT * FROM users WHERE username = $1', 
      [username]
    );

    if (!user || !await bcrypt.compare(password, user.password_hash)) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }));
    }

    // 检测设备指纹
    const currentFingerprint = request.headers.get('X-Device-Fingerprint');
    const lastLogin = await env.D1.oneOrNone(
      'SELECT * FROM logins 
       WHERE user_id = $1 
       ORDER BY login_time DESC 
       LIMIT 1',
      [user.id]
    );

    if (lastLogin && lastLogin.fingerprint !== currentFingerprint) {
      // 记录异常登录
      await env.D1.execute(
        'INSERT INTO login_attempts (user_id, ip, fingerprint)
         VALUES ($1, $2, $3)',
        [user.id, request.headers.get('CF-Connecting-IP'), currentFingerprint]
      );
      
      // 检测共享行为
      const attempts = await env.D1.any(
        'SELECT COUNT(*) FROM login_attempts 
         WHERE user_id = $1 
         AND timestamp > NOW() - INTERVAL \'1 hour\'',
        [user.id]
      );
      
      if (attempts >= 3) {
        await env.D1.execute(
          'UPDATE users SET status = \'blocked\' WHERE id = $1',
          [user.id]
        );
        return new Response('Account temporarily blocked due to suspicious activity');
      }
    }

    // 生成会话令牌
    const token = jwt.sign({ userId: user.id }, env.JWT_SECRET);
    return new Response(JSON.stringify({ token }));
  }
};
